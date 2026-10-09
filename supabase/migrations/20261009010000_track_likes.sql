-- Public per-track like counts.
-- Favorites stay private (RLS: only your own rows), so the library can't
-- count them directly. This table holds just the totals — no user ids —
-- and is kept in sync by a trigger on favorites. One heart per user per
-- track (favorites' primary key), so likes = number of people.

create table public.track_likes (
  track_src  text primary key,
  likes      int not null default 0 check (likes >= 0),
  updated_at timestamptz not null default now()
);

create function public.sync_track_likes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.track_likes as t (track_src, likes)
    values (new.track_src, 1)
    on conflict (track_src) do update set likes = t.likes + 1, updated_at = now();
  else
    update public.track_likes
    set likes = greatest(0, likes - 1), updated_at = now()
    where track_src = old.track_src;
  end if;
  return null;
end;
$$;

create trigger favorites_track_likes
  after insert or delete on public.favorites
  for each row execute function public.sync_track_likes();

-- Count any hearts that already exist
insert into public.track_likes (track_src, likes)
select track_src, count(*)::int from public.favorites group by track_src
on conflict (track_src) do update set likes = excluded.likes;

-- Everyone can read the totals; only the trigger writes them
alter table public.track_likes enable row level security;
create policy "track likes readable" on public.track_likes
  for select using (true);
revoke insert, update, delete on public.track_likes from anon, authenticated;
