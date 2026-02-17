// Auth routes: signup, login, OAuth callbacks
import { createToken, generateId } from './jwt.js';
import { json } from './index.js';

export async function handleAuth(request, env, path) {
  if (path === '/auth/signup' && request.method === 'POST') {
    return signup(request, env);
  }
  if (path === '/auth/login' && request.method === 'POST') {
    return login(request, env);
  }
  // OAuth routes (Phase 2)
  if (path === '/auth/google') return oauthRedirect('google', env);
  if (path === '/auth/github') return oauthRedirect('github', env);
  if (path === '/auth/discord') return oauthRedirect('discord', env);
  if (path === '/auth/callback/google') return oauthCallback('google', request, env);
  if (path === '/auth/callback/github') return oauthCallback('github', request, env);
  if (path === '/auth/callback/discord') return oauthCallback('discord', request, env);

  return json({ error: 'Not found' }, 404);
}

// Hash password using Web Crypto (PBKDF2)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt, b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password, stored) {
  const [saltHex, storedHash] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashHex = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === storedHash;
}

async function signup(request, env) {
  const { email, username, password } = await request.json();

  if (!email || !username || !password) {
    return json({ error: 'Email, username, and password are required' }, 400);
  }
  if (password.length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, 400);
  }
  if (username.length < 3 || username.length > 30) {
    return json({ error: 'Username must be 3-30 characters' }, 400);
  }

  // Check if email or username already exists
  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ? OR username = ?'
  ).bind(email.toLowerCase(), username).first();

  if (existing) {
    return json({ error: 'Email or username already taken' }, 409);
  }

  const id = generateId();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    'INSERT INTO users (id, email, username, password_hash, auth_provider) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, email.toLowerCase(), username, passwordHash, 'email').run();

  const token = await createToken(
    { id, email: email.toLowerCase(), username },
    env.JWT_SECRET,
    86400 * 7 // 7 days
  );

  return json({ token, user: { id, email: email.toLowerCase(), username } }, 201);
}

async function login(request, env) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return json({ error: 'Email and password are required' }, 400);
  }

  const user = await env.DB.prepare(
    'SELECT id, email, username, password_hash, avatar_url FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first();

  if (!user || !user.password_hash) {
    return json({ error: 'Invalid email or password' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return json({ error: 'Invalid email or password' }, 401);
  }

  const token = await createToken(
    { id: user.id, email: user.email, username: user.username },
    env.JWT_SECRET,
    86400 * 7
  );

  return json({
    token,
    user: { id: user.id, email: user.email, username: user.username, avatar_url: user.avatar_url }
  });
}

// OAuth — placeholder for Phase 2
function oauthRedirect(provider, env) {
  return json({ error: `${provider} OAuth not yet configured. Set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in wrangler.toml vars.` }, 501);
}

async function oauthCallback(provider, request, env) {
  return json({ error: `${provider} OAuth callback not yet configured` }, 501);
}
