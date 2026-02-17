-- AudioOasis D1 Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,           -- NULL for OAuth-only users
  auth_provider TEXT DEFAULT 'email',  -- 'email', 'google', 'github', 'discord'
  auth_provider_id TEXT,        -- OAuth provider's user ID
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Sessions table (JWT refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Favorites (user's hearted tracks)
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_src TEXT NOT NULL,      -- the track src URL (unique identifier)
  track_title TEXT NOT NULL,
  track_category TEXT,
  position INTEGER DEFAULT 0,  -- for custom ordering within favorites
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, track_src)
);

-- Community playlists
CREATE TABLE IF NOT EXISTS community_playlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'all',     -- 'all', 'music', 'video'
  is_public INTEGER DEFAULT 1,
  total_likes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Community playlist tracks
CREATE TABLE IF NOT EXISTS community_playlist_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id TEXT NOT NULL REFERENCES community_playlists(id) ON DELETE CASCADE,
  track_src TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_category TEXT,
  track_duration TEXT,
  position INTEGER DEFAULT 0,
  added_at TEXT DEFAULT (datetime('now'))
);

-- Community playlist videos
CREATE TABLE IF NOT EXISTS community_playlist_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id TEXT NOT NULL REFERENCES community_playlists(id) ON DELETE CASCADE,
  video_src TEXT NOT NULL,
  video_title TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  added_at TEXT DEFAULT (datetime('now'))
);

-- Playlist likes
CREATE TABLE IF NOT EXISTS playlist_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playlist_id TEXT NOT NULL REFERENCES community_playlists(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, playlist_id)
);

-- Listening history
CREATE TABLE IF NOT EXISTS listen_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_src TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_category TEXT,
  listened_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_track ON favorites(track_src);
CREATE INDEX IF NOT EXISTS idx_community_playlists_user ON community_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_community_playlists_likes ON community_playlists(total_likes DESC);
CREATE INDEX IF NOT EXISTS idx_playlist_likes_user ON playlist_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_likes_playlist ON playlist_likes(playlist_id);
CREATE INDEX IF NOT EXISTS idx_listen_history_user ON listen_history(user_id, listened_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
