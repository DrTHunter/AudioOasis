// Auth routes: signup, login, OAuth callbacks
import { createToken, generateId } from './jwt.js';
import { json } from './index.js';

const OAUTH_PROVIDERS = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: 'openid email profile',
  },
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    emailUrl: 'https://api.github.com/user/emails',
    scopes: 'read:user user:email',
  },
  discord: {
    authorizeUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    scopes: 'identify email',
  },
};

export async function handleAuth(request, env, path) {
  if (path === '/auth/signup' && request.method === 'POST') {
    return signup(request, env);
  }
  if (path === '/auth/login' && request.method === 'POST') {
    return login(request, env);
  }
  // OAuth redirect routes
  if (path === '/auth/google') return oauthRedirect('google', env);
  if (path === '/auth/github') return oauthRedirect('github', env);
  if (path === '/auth/discord') return oauthRedirect('discord', env);
  // OAuth callback routes
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
    86400 * 30 // 30 days
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
    86400 * 30 // 30 days
  );

  return json({
    token,
    user: { id: user.id, email: user.email, username: user.username, avatar_url: user.avatar_url }
  });
}

// ─── OAuth Flow ───

function getClientId(provider, env) {
  const key = `${provider.toUpperCase()}_CLIENT_ID`;
  return env[key];
}

function getClientSecret(provider, env) {
  const key = `${provider.toUpperCase()}_CLIENT_SECRET`;
  return env[key];
}

function oauthRedirect(provider, env) {
  const clientId = getClientId(provider, env);
  if (!clientId) {
    return json({ error: `${provider} OAuth not configured` }, 501);
  }

  const config = OAUTH_PROVIDERS[provider];
  const callbackUrl = `https://audiooasis-api.dr-hunter.workers.dev/auth/callback/${provider}`;

  // Generate a random state to prevent CSRF
  const state = generateId();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: config.scopes,
    state: state,
  });

  // Discord needs prompt=consent to always show the consent screen
  if (provider === 'discord') {
    params.set('prompt', 'consent');
  }
  // Google: request consent and offline access
  if (provider === 'google') {
    params.set('access_type', 'online');
    params.set('prompt', 'consent');
  }

  return new Response(null, {
    status: 302,
    headers: { Location: `${config.authorizeUrl}?${params.toString()}` },
  });
}

async function oauthCallback(provider, request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const frontendUrl = env.FRONTEND_URL || 'https://audiooasis.app';

  if (error || !code) {
    return Response.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(error || 'no_code')}`, 302);
  }

  try {
    const config = OAUTH_PROVIDERS[provider];
    const callbackUrl = `https://audiooasis-api.dr-hunter.workers.dev/auth/callback/${provider}`;
    const clientId = getClientId(provider, env);
    const clientSecret = getClientSecret(provider, env);

    // Exchange code for access token
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    });

    const tokenHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };
    // GitHub needs Accept: application/json
    if (provider === 'github') {
      tokenHeaders['Accept'] = 'application/json';
    }

    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: tokenHeaders,
      body: tokenBody.toString(),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('OAuth token error:', JSON.stringify(tokenData));
      return Response.redirect(`${frontendUrl}?auth_error=token_failed`, 302);
    }

    // Fetch user info from provider
    const userInfo = await fetchOAuthUserInfo(provider, accessToken, config);
    if (!userInfo || !userInfo.email) {
      return Response.redirect(`${frontendUrl}?auth_error=no_email`, 302);
    }

    // Find or create user
    const user = await findOrCreateOAuthUser(env, provider, userInfo);

    // Create JWT
    const token = await createToken(
      { id: user.id, email: user.email, username: user.username },
      env.JWT_SECRET,
      86400 * 30  // 30 days
    );

    // Redirect back to frontend with token in hash (not exposed to server logs)
    return Response.redirect(`${frontendUrl}#auth_token=${token}`, 302);

  } catch (err) {
    console.error('OAuth callback error:', err);
    return Response.redirect(`${frontendUrl}?auth_error=server_error`, 302);
  }
}

async function fetchOAuthUserInfo(provider, accessToken, config) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  // GitHub uses token instead of Bearer
  if (provider === 'github') {
    headers['Authorization'] = `token ${accessToken}`;
    headers['User-Agent'] = 'AudioOasis-App';
  }

  const res = await fetch(config.userInfoUrl, { headers });
  const data = await res.json();

  if (provider === 'google') {
    return {
      provider_id: String(data.id),
      email: data.email,
      username: data.name || data.email.split('@')[0],
      avatar_url: data.picture || null,
    };
  }

  if (provider === 'github') {
    let email = data.email;
    // GitHub doesn't always return email in the profile — fetch from /user/emails
    if (!email && config.emailUrl) {
      const emailRes = await fetch(config.emailUrl, { headers });
      const emails = await emailRes.json();
      const primary = emails.find(e => e.primary && e.verified);
      email = primary ? primary.email : (emails[0] ? emails[0].email : null);
    }
    return {
      provider_id: String(data.id),
      email: email,
      username: data.login,
      avatar_url: data.avatar_url || null,
    };
  }

  if (provider === 'discord') {
    return {
      provider_id: String(data.id),
      email: data.email,
      username: data.username || data.global_name || `discord_${data.id}`,
      avatar_url: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : null,
    };
  }

  return null;
}

async function findOrCreateOAuthUser(env, provider, userInfo) {
  // First check if this exact OAuth user already exists
  const existingOAuth = await env.DB.prepare(
    'SELECT id, email, username, avatar_url FROM users WHERE auth_provider = ? AND auth_provider_id = ?'
  ).bind(provider, userInfo.provider_id).first();

  if (existingOAuth) {
    // Update avatar if changed
    if (userInfo.avatar_url && userInfo.avatar_url !== existingOAuth.avatar_url) {
      await env.DB.prepare('UPDATE users SET avatar_url = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind(userInfo.avatar_url, existingOAuth.id).run();
    }
    return existingOAuth;
  }

  // Check if a user with this email already exists (link accounts)
  const existingEmail = await env.DB.prepare(
    'SELECT id, email, username, avatar_url FROM users WHERE email = ?'
  ).bind(userInfo.email.toLowerCase()).first();

  if (existingEmail) {
    // Link this OAuth provider to existing account
    await env.DB.prepare(
      'UPDATE users SET auth_provider = ?, auth_provider_id = ?, avatar_url = COALESCE(avatar_url, ?), updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(provider, userInfo.provider_id, userInfo.avatar_url, existingEmail.id).run();
    return existingEmail;
  }

  // Create new user — ensure username is unique
  let username = userInfo.username.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  if (username.length < 3) username = `user_${userInfo.provider_id.substring(0, 8)}`;

  const existingUsername = await env.DB.prepare(
    'SELECT id FROM users WHERE username = ?'
  ).bind(username).first();

  if (existingUsername) {
    username = `${username}_${generateId().substring(0, 6)}`;
  }

  const id = generateId();
  await env.DB.prepare(
    'INSERT INTO users (id, email, username, password_hash, auth_provider, auth_provider_id, avatar_url) VALUES (?, ?, ?, NULL, ?, ?, ?)'
  ).bind(id, userInfo.email.toLowerCase(), username, provider, userInfo.provider_id, userInfo.avatar_url).run();

  return { id, email: userInfo.email.toLowerCase(), username, avatar_url: userInfo.avatar_url };
}
