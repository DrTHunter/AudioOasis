# AudioOasis — Supabase backend

Accounts, favorites, listening history and community playlists run on
Supabase (project `otazcgnwvsvshcgxjqoi`). The page talks to Postgres
directly with the public anon key; row-level security in
[`migrations/`](migrations/) decides what each visitor can read or write.

This replaces the old Cloudflare Worker + D1 API in [`../api`](../api),
which is no longer called by the site.

## Schema

`migrations/20261009000000_init.sql` creates:

| Object | Purpose |
|---|---|
| `profiles` | Public username + avatar per auth user, created by trigger on signup |
| `favorites` | Hearted tracks (private) |
| `listen_history` | Played tracks (private) |
| `community_playlists`, `community_playlist_tracks`, `community_playlist_videos` | Shared playlists (public read, owner write) |
| `playlist_likes` | Likes; `total_likes` is kept in sync by trigger |
| `community_feed` (view) | Feed rows with creator name, counts, `liked_by_me` |
| `share_playlist()` / `toggle_playlist_like()` | RPCs used by the page |

With the GitHub integration connected, migrations in `supabase/migrations`
are applied when they land on `main`. Without it, paste the file into the
dashboard's SQL editor and run it once.

## Dashboard setup

**Authentication → URL Configuration**

- Site URL: `https://audiooasis.app`
- Redirect URLs:
  - `https://audiooasis.app/**`
  - `https://drthunter.github.io/AudioOasis/**`
  - `http://localhost:8765/**` (local testing)

**Authentication → Sign In / Providers**

- Email: on. Turn "Confirm email" off if you want instant signups; with it
  on, users get a confirmation link before they can log in.
- Google, GitHub, Discord: enable each and paste that provider's client ID
  and secret. In each provider's developer console, set the OAuth callback
  URL to:

  ```
  https://otazcgnwvsvshcgxjqoi.supabase.co/auth/v1/callback
  ```

  (The old Worker callbacks, `.../auth/callback/<provider>`, can be removed
  from the provider apps once the switch is live.)

## Keys

`index.html` holds `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Both are public
by design. Never put the `service_role` / secret key in the site.
