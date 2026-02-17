// History routes: record listens, get recent history
import { json } from './index.js';

export async function handleHistory(request, env, path, user) {
  // POST /history — record a listen event
  if (path === '/history' && request.method === 'POST') {
    return recordListen(request, env, user);
  }

  // GET /history — get recent listening history
  if (path === '/history' && request.method === 'GET') {
    return getHistory(request, env, user);
  }

  // DELETE /history — clear all history
  if (path === '/history' && request.method === 'DELETE') {
    return clearHistory(env, user);
  }

  return json({ error: 'Not found' }, 404);
}

async function recordListen(request, env, user) {
  const { track_src, track_title, track_category } = await request.json();

  if (!track_src || !track_title) {
    return json({ error: 'track_src and track_title are required' }, 400);
  }

  await env.DB.prepare(
    'INSERT INTO listen_history (user_id, track_src, track_title, track_category) VALUES (?, ?, ?, ?)'
  ).bind(user.id, track_src, track_title, track_category || '').run();

  return json({ ok: true }, 201);
}

async function getHistory(request, env, user) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;

  const { results } = await env.DB.prepare(
    'SELECT id, track_src, track_title, track_category, listened_at FROM listen_history WHERE user_id = ? ORDER BY listened_at DESC LIMIT ? OFFSET ?'
  ).bind(user.id, limit, offset).all();

  return json({ history: results, page, limit });
}

async function clearHistory(env, user) {
  await env.DB.prepare(
    'DELETE FROM listen_history WHERE user_id = ?'
  ).bind(user.id).run();

  return json({ ok: true });
}
