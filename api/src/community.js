// Community playlists routes: list, create, like, get details
import { json } from './index.js';

export async function handleCommunityPlaylists(request, env, path, user) {
  // GET /community/playlists — list all (public, no auth required; user passed may be null)
  if (path === '/community/playlists' && request.method === 'GET') {
    return listPlaylists(request, env, user);
  }

  // POST /community/playlists — create playlist (auth required)
  if (path === '/community/playlists' && request.method === 'POST') {
    if (!user) return json({ error: 'Login required' }, 401);
    return createPlaylist(request, env, user);
  }

  // GET /community/playlists/:id — get playlist details
  const detailMatch = path.match(/^\/community\/playlists\/([a-f0-9]+)$/);
  if (detailMatch && request.method === 'GET') {
    return getPlaylist(env, detailMatch[1], user);
  }

  // POST /community/playlists/:id/like — toggle like
  const likeMatch = path.match(/^\/community\/playlists\/([a-f0-9]+)\/like$/);
  if (likeMatch && request.method === 'POST') {
    if (!user) return json({ error: 'Login required' }, 401);
    return toggleLike(env, likeMatch[1], user);
  }

  // DELETE /community/playlists/:id — delete own playlist
  const deleteMatch = path.match(/^\/community\/playlists\/([a-f0-9]+)$/);
  if (deleteMatch && request.method === 'DELETE') {
    if (!user) return json({ error: 'Login required' }, 401);
    return deletePlaylist(env, deleteMatch[1], user);
  }

  return json({ error: 'Not found' }, 404);
}

async function listPlaylists(request, env, user) {
  const url = new URL(request.url);
  const sort = url.searchParams.get('sort') || 'likes'; // 'likes' | 'newest'
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  const orderBy = sort === 'newest' ? 'cp.created_at DESC' : 'cp.total_likes DESC, cp.created_at DESC';

  const { results } = await env.DB.prepare(`
    SELECT cp.id, cp.name, cp.description, cp.total_likes, cp.created_at,
           u.username as creator_name, u.avatar_url as creator_avatar,
           (SELECT COUNT(*) FROM community_playlist_tracks WHERE playlist_id = cp.id) as track_count,
           (SELECT COUNT(*) FROM community_playlist_videos WHERE playlist_id = cp.id) as video_count
    FROM community_playlists cp
    JOIN users u ON cp.user_id = u.id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  // If user is logged in, check which playlists they've liked
  if (user) {
    const ids = results.map(r => r.id);
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const { results: likes } = await env.DB.prepare(
        `SELECT playlist_id FROM playlist_likes WHERE user_id = ? AND playlist_id IN (${placeholders})`
      ).bind(user.id, ...ids).all();

      const likedSet = new Set(likes.map(l => l.playlist_id));
      results.forEach(r => r.liked_by_me = likedSet.has(r.id));
    }
  }

  return json({ playlists: results, page, limit });
}

async function createPlaylist(request, env, user) {
  const { name, description, tracks, videos } = await request.json();

  if (!name || name.length < 1 || name.length > 100) {
    return json({ error: 'Name is required (1-100 characters)' }, 400);
  }

  const id = crypto.randomUUID().replace(/-/g, '');

  await env.DB.prepare(
    'INSERT INTO community_playlists (id, user_id, name, description) VALUES (?, ?, ?, ?)'
  ).bind(id, user.id, name, description || '').run();

  // Insert tracks
  if (Array.isArray(tracks) && tracks.length > 0) {
    const trackStmt = env.DB.prepare(
      'INSERT INTO community_playlist_tracks (playlist_id, track_src, track_title, track_category, position) VALUES (?, ?, ?, ?, ?)'
    );
    const batch = tracks.map((t, i) =>
      trackStmt.bind(id, t.src, t.title, t.category || '', i)
    );
    await env.DB.batch(batch);
  }

  // Insert videos
  if (Array.isArray(videos) && videos.length > 0) {
    const videoStmt = env.DB.prepare(
      'INSERT INTO community_playlist_videos (playlist_id, video_src, video_title, position) VALUES (?, ?, ?, ?)'
    );
    const batch = videos.map((v, i) =>
      videoStmt.bind(id, v.src, v.title, i)
    );
    await env.DB.batch(batch);
  }

  return json({ id, name }, 201);
}

async function getPlaylist(env, playlistId, user) {
  const playlist = await env.DB.prepare(`
    SELECT cp.id, cp.name, cp.description, cp.total_likes, cp.created_at,
           u.username as creator_name, u.avatar_url as creator_avatar
    FROM community_playlists cp
    JOIN users u ON cp.user_id = u.id
    WHERE cp.id = ?
  `).bind(playlistId).first();

  if (!playlist) {
    return json({ error: 'Playlist not found' }, 404);
  }

  // Get tracks and videos
  const [{ results: tracks }, { results: videos }] = await Promise.all([
    env.DB.prepare(
      'SELECT track_src, track_title, track_category, position FROM community_playlist_tracks WHERE playlist_id = ? ORDER BY position'
    ).bind(playlistId).all(),
    env.DB.prepare(
      'SELECT video_src, video_title, position FROM community_playlist_videos WHERE playlist_id = ? ORDER BY position'
    ).bind(playlistId).all(),
  ]);

  playlist.tracks = tracks;
  playlist.videos = videos;

  // Check if current user liked it
  if (user) {
    const like = await env.DB.prepare(
      'SELECT id FROM playlist_likes WHERE user_id = ? AND playlist_id = ?'
    ).bind(user.id, playlistId).first();
    playlist.liked_by_me = !!like;
  }

  return json({ playlist });
}

async function toggleLike(env, playlistId, user) {
  // Check playlist exists
  const playlist = await env.DB.prepare(
    'SELECT id FROM community_playlists WHERE id = ?'
  ).bind(playlistId).first();

  if (!playlist) {
    return json({ error: 'Playlist not found' }, 404);
  }

  // Check if already liked
  const existing = await env.DB.prepare(
    'SELECT id FROM playlist_likes WHERE user_id = ? AND playlist_id = ?'
  ).bind(user.id, playlistId).first();

  if (existing) {
    // Unlike
    await env.DB.batch([
      env.DB.prepare('DELETE FROM playlist_likes WHERE id = ?').bind(existing.id),
      env.DB.prepare('UPDATE community_playlists SET total_likes = MAX(0, total_likes - 1) WHERE id = ?').bind(playlistId),
    ]);
    return json({ liked: false });
  } else {
    // Like
    await env.DB.batch([
      env.DB.prepare('INSERT INTO playlist_likes (user_id, playlist_id) VALUES (?, ?)').bind(user.id, playlistId),
      env.DB.prepare('UPDATE community_playlists SET total_likes = total_likes + 1 WHERE id = ?').bind(playlistId),
    ]);
    return json({ liked: true });
  }
}

async function deletePlaylist(env, playlistId, user) {
  // Only the creator can delete
  const playlist = await env.DB.prepare(
    'SELECT id FROM community_playlists WHERE id = ? AND user_id = ?'
  ).bind(playlistId, user.id).first();

  if (!playlist) {
    return json({ error: 'Playlist not found or not owned by you' }, 404);
  }

  // Cascade delete: tracks, videos, likes, then playlist
  await env.DB.batch([
    env.DB.prepare('DELETE FROM community_playlist_tracks WHERE playlist_id = ?').bind(playlistId),
    env.DB.prepare('DELETE FROM community_playlist_videos WHERE playlist_id = ?').bind(playlistId),
    env.DB.prepare('DELETE FROM playlist_likes WHERE playlist_id = ?').bind(playlistId),
    env.DB.prepare('DELETE FROM community_playlists WHERE id = ?').bind(playlistId),
  ]);

  return json({ ok: true });
}
