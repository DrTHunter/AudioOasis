// Favorites routes: list, add, remove, reorder
import { json } from './index.js';

export async function handleFavorites(request, env, path, user) {
  // GET /favorites — list user's favorites
  if (path === '/favorites' && request.method === 'GET') {
    return listFavorites(env, user);
  }

  // POST /favorites — add a track to favorites
  if (path === '/favorites' && request.method === 'POST') {
    return addFavorite(request, env, user);
  }

  // DELETE /favorites — remove a track from favorites (track_src in body)
  if (path === '/favorites' && request.method === 'DELETE') {
    return removeFavorite(request, env, user);
  }

  // PUT /favorites/reorder — reorder favorites
  if (path === '/favorites/reorder' && request.method === 'PUT') {
    return reorderFavorites(request, env, user);
  }

  return json({ error: 'Not found' }, 404);
}

async function listFavorites(env, user) {
  const { results } = await env.DB.prepare(
    'SELECT id, track_src, track_title, track_category, position, created_at FROM favorites WHERE user_id = ? ORDER BY position ASC'
  ).bind(user.id).all();

  return json({ favorites: results });
}

async function addFavorite(request, env, user) {
  const { track_src, track_title, track_category } = await request.json();

  if (!track_src || !track_title) {
    return json({ error: 'track_src and track_title are required' }, 400);
  }

  // Check if already favorited
  const existing = await env.DB.prepare(
    'SELECT id FROM favorites WHERE user_id = ? AND track_src = ?'
  ).bind(user.id, track_src).first();

  if (existing) {
    return json({ error: 'Track already in favorites' }, 409);
  }

  // Get max position to append at end
  const maxPos = await env.DB.prepare(
    'SELECT MAX(position) as max_pos FROM favorites WHERE user_id = ?'
  ).bind(user.id).first();

  const position = (maxPos?.max_pos ?? -1) + 1;

  const result = await env.DB.prepare(
    'INSERT INTO favorites (user_id, track_src, track_title, track_category, position) VALUES (?, ?, ?, ?, ?)'
  ).bind(user.id, track_src, track_title, track_category || '', position).run();

  return json({ id: result.meta.last_row_id, position }, 201);
}

async function removeFavorite(request, env, user) {
  const { track_src } = await request.json();

  if (!track_src) {
    return json({ error: 'track_src is required' }, 400);
  }

  const result = await env.DB.prepare(
    'DELETE FROM favorites WHERE user_id = ? AND track_src = ?'
  ).bind(user.id, track_src).run();

  if (result.meta.changes === 0) {
    return json({ error: 'Favorite not found' }, 404);
  }

  return json({ ok: true });
}

async function reorderFavorites(request, env, user) {
  const { order } = await request.json(); // Array of { id, position }

  if (!Array.isArray(order)) {
    return json({ error: 'order must be an array of { id, position }' }, 400);
  }

  const stmt = env.DB.prepare(
    'UPDATE favorites SET position = ? WHERE id = ? AND user_id = ?'
  );

  const batch = order.map(item =>
    stmt.bind(item.position, item.id, user.id)
  );

  await env.DB.batch(batch);

  return json({ ok: true });
}
