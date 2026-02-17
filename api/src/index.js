// AudioOasis API — Cloudflare Worker
// Lightweight router + auth + favorites + community playlists

import { handleAuth } from './auth.js';
import { handleFavorites } from './favorites.js';
import { handleCommunityPlaylists } from './community.js';
import { handleHistory } from './history.js';
import { verifyToken } from './jwt.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers — allow production domain + GitHub Pages + localhost
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      env.FRONTEND_URL,
      'https://drthunter.github.io',
      'http://localhost:9753',
    ].filter(Boolean);
    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      let response;

      // Public routes (no auth required)
      if (path.startsWith('/auth/')) {
        response = await handleAuth(request, env, path);
      }
      // Public: browse community playlists
      else if (path === '/community/playlists' && request.method === 'GET') {
        response = await handleCommunityPlaylists(request, env, path, null);
      }
      // Protected routes (auth required)
      else {
        const user = await authenticate(request, env);
        if (!user) {
          response = json({ error: 'Unauthorized' }, 401);
        } else if (path.startsWith('/favorites')) {
          response = await handleFavorites(request, env, path, user);
        } else if (path.startsWith('/community')) {
          response = await handleCommunityPlaylists(request, env, path, user);
        } else if (path.startsWith('/history')) {
          response = await handleHistory(request, env, path, user);
        } else if (path === '/me') {
          response = json({ user: { id: user.id, email: user.email, username: user.username, avatar_url: user.avatar_url } });
        } else {
          response = json({ error: 'Not found' }, 404);
        }
      }

      // Add CORS headers to response
      const newHeaders = new Headers(response.headers);
      for (const [key, val] of Object.entries(corsHeaders)) {
        newHeaders.set(key, val);
      }
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (err) {
      console.error('API Error:', err);
      return json({ error: 'Internal server error' }, 500, corsHeaders);
    }
  },
};

// Extract and verify JWT from Authorization header
async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token, env.JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// Helper: JSON response
export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
