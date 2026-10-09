-- AudioOasis — Supabase schema
-- Replaces the Cloudflare Worker + D1 backend. Auth is Supabase Auth
-- (auth.users); everything app-specific lives in public.* behind RLS,
-- so the browser talks to Postgres directly with the anon key.

-- ═══════════════ Profiles ═══════════════
-- Public-facing identity. Email stays private in auth.users.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique check (char_length(username) between 3 and 30),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Create a profile for every new auth user. Username comes from the signup
-- form (email signup) or the OAuth provider; collisions get a numeric suffix
-- so signup never fails on a taken name.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'user_name', ''),        -- GitHub
    nullif(new.raw_user_meta_data ->> 'preferred_username', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1)
  );
  base := left(regexp_replace(base, '[^A-Za-z0-9_.-]+', '_', 'g'), 24);
  if char_length(base) < 3 then
    base := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into public.profiles (id, username, avatar_url)
  values (new.id, candidate, new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════ Favorites ═══════════════
create table public.favorites (
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  track_src       text not null,
  track_title     text not null,
  track_category  text,
  created_at      timestamptz not null default now(),
  primary key (user_id, track_src)
);

-- ═══════════════ Listening history ═══════════════
create table public.listen_history (
  id              bigint generated always as identity primary key,
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  track_src       text not null,
  track_title     text not null,
  track_category  text,
  listened_at     timestamptz not null default now()
);
create index listen_history_user_time on public.listen_history (user_id, listened_at desc);

-- ═══════════════ Community playlists ═══════════════
create table public.community_playlists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 100),
  description  text not null default '',
  is_public    boolean not null default true,
  total_likes  int not null default 0,
  created_at   timestamptz not null default now()
);
create index community_playlists_likes on public.community_playlists (total_likes desc, created_at desc);
create index community_playlists_user on public.community_playlists (user_id);

create table public.community_playlist_tracks (
  id              bigint generated always as identity primary key,
  playlist_id     uuid not null references public.community_playlists (id) on delete cascade,
  track_src       text not null,
  track_title     text not null,
  track_category  text,
  track_duration  text,
  position        int not null default 0
);
create index community_playlist_tracks_pl on public.community_playlist_tracks (playlist_id, position);

create table public.community_playlist_videos (
  id           bigint generated always as identity primary key,
  playlist_id  uuid not null references public.community_playlists (id) on delete cascade,
  video_src    text not null,
  video_title  text not null,
  position     int not null default 0
);
create index community_playlist_videos_pl on public.community_playlist_videos (playlist_id, position);

create table public.playlist_likes (
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  playlist_id  uuid not null references public.community_playlists (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, playlist_id)
);
create index playlist_likes_playlist on public.playlist_likes (playlist_id);

-- Keep total_likes in sync. Runs as definer because likers can't update
-- other people's playlists under RLS.
create function public.sync_playlist_likes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_playlists set total_likes = total_likes + 1 where id = new.playlist_id;
  else
    update public.community_playlists set total_likes = greatest(0, total_likes - 1) where id = old.playlist_id;
  end if;
  return null;
end;
$$;

create trigger playlist_likes_count
  after insert or delete on public.playlist_likes
  for each row execute function public.sync_playlist_likes();

-- ═══════════════ Feed view ═══════════════
-- One row per visible playlist with creator + counts + liked_by_me.
-- security_invoker so the caller's RLS applies.
create view public.community_feed
with (security_invoker = true) as
select
  cp.id,
  cp.name,
  cp.description,
  cp.total_likes,
  cp.created_at,
  p.username   as creator_name,
  p.avatar_url as creator_avatar,
  (select count(*) from public.community_playlist_tracks t where t.playlist_id = cp.id)::int as track_count,
  (select count(*) from public.community_playlist_videos v where v.playlist_id = cp.id)::int as video_count,
  exists (
    select 1 from public.playlist_likes l
    where l.playlist_id = cp.id and l.user_id = auth.uid()
  ) as liked_by_me
from public.community_playlists cp
join public.profiles p on p.id = cp.user_id;

-- ═══════════════ RPCs ═══════════════
-- Create a playlist and its items in one transaction.
-- p_tracks: [{src,title,category,duration}]  p_videos: [{src,title}]
create function public.share_playlist(p_name text, p_tracks jsonb default '[]', p_videos jsonb default '[]')
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;
  if jsonb_array_length(p_tracks) + jsonb_array_length(p_videos) = 0 then
    raise exception 'Playlist is empty';
  end if;
  if jsonb_array_length(p_tracks) > 500 or jsonb_array_length(p_videos) > 200 then
    raise exception 'Playlist is too large';
  end if;

  insert into public.community_playlists (name) values (trim(p_name)) returning id into new_id;

  insert into public.community_playlist_tracks (playlist_id, track_src, track_title, track_category, track_duration, position)
  select new_id, t ->> 'src', t ->> 'title', t ->> 'category', t ->> 'duration', (ord - 1)::int
  from jsonb_array_elements(p_tracks) with ordinality as x(t, ord);

  insert into public.community_playlist_videos (playlist_id, video_src, video_title, position)
  select new_id, v ->> 'src', v ->> 'title', (ord - 1)::int
  from jsonb_array_elements(p_videos) with ordinality as x(v, ord);

  return new_id;
end;
$$;

-- Toggle the caller's like; returns the new liked state.
create function public.toggle_playlist_like(p_playlist_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;
  delete from public.playlist_likes where user_id = auth.uid() and playlist_id = p_playlist_id;
  if found then
    return false;
  end if;
  insert into public.playlist_likes (playlist_id) values (p_playlist_id);
  return true;
end;
$$;

-- ═══════════════ Row-level security ═══════════════
alter table public.profiles                  enable row level security;
alter table public.favorites                 enable row level security;
alter table public.listen_history            enable row level security;
alter table public.community_playlists       enable row level security;
alter table public.community_playlist_tracks enable row level security;
alter table public.community_playlist_videos enable row level security;
alter table public.playlist_likes            enable row level security;

-- profiles: usernames are public; you can edit only your own
create policy "profiles readable" on public.profiles
  for select using (true);
create policy "profiles self update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- favorites: fully private
create policy "favorites own" on public.favorites
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- history: private; read, add, clear your own
create policy "history read own" on public.listen_history
  for select to authenticated using (user_id = (select auth.uid()));
create policy "history insert own" on public.listen_history
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "history delete own" on public.listen_history
  for delete to authenticated using (user_id = (select auth.uid()));

-- community playlists: public ones visible to everyone, owners manage theirs
create policy "playlists readable" on public.community_playlists
  for select using (is_public or user_id = (select auth.uid()));
create policy "playlists insert own" on public.community_playlists
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "playlists delete own" on public.community_playlists
  for delete to authenticated using (user_id = (select auth.uid()));

-- playlist items follow their parent playlist
create policy "tracks readable" on public.community_playlist_tracks
  for select using (exists (
    select 1 from public.community_playlists cp
    where cp.id = playlist_id and (cp.is_public or cp.user_id = (select auth.uid()))));
create policy "tracks insert own" on public.community_playlist_tracks
  for insert to authenticated with check (exists (
    select 1 from public.community_playlists cp
    where cp.id = playlist_id and cp.user_id = (select auth.uid())));

create policy "videos readable" on public.community_playlist_videos
  for select using (exists (
    select 1 from public.community_playlists cp
    where cp.id = playlist_id and (cp.is_public or cp.user_id = (select auth.uid()))));
create policy "videos insert own" on public.community_playlist_videos
  for insert to authenticated with check (exists (
    select 1 from public.community_playlists cp
    where cp.id = playlist_id and cp.user_id = (select auth.uid())));

-- likes: you see and manage only your own (counts come from total_likes)
create policy "likes read own" on public.playlist_likes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "likes insert own" on public.playlist_likes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "likes delete own" on public.playlist_likes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Clients may only set descriptive columns: total_likes is trigger-owned
-- and user_id always defaults to the caller.
revoke insert, update on public.community_playlists from anon, authenticated;
grant insert (name, description, is_public) on public.community_playlists to authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;

-- RPCs callable by signed-in users only
revoke execute on function public.share_playlist(text, jsonb, jsonb) from public, anon;
revoke execute on function public.toggle_playlist_like(uuid) from public, anon;
grant execute on function public.share_playlist(text, jsonb, jsonb) to authenticated;
grant execute on function public.toggle_playlist_like(uuid) to authenticated;
