import { createSessionToken, verifySessionToken, parseCookies } from '../_shared/session.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function handleLogin(request, env) {
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/api/auth/callback`;
  const next = url.searchParams.get('next') || '/';

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'read:user');
  authorizeUrl.searchParams.set('state', state);

  const headers = new Headers({ Location: authorizeUrl.toString() });
  headers.append('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
  headers.append(
    'Set-Cookie',
    `oauth_next=${encodeURIComponent(next)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
  );
  return new Response(null, { status: 302, headers });
}

export async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(request);

  if (!code || !state || state !== cookies.oauth_state) {
    return new Response('Invalid OAuth state. Please try signing in again.', { status: 400 });
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/auth/callback`,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return new Response('GitHub sign-in failed. Please try again.', { status: 400 });
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'serie-a-tv-audience',
      Accept: 'application/vnd.github+json',
    },
  });
  const user = await userRes.json();

  const allowed = (env.ALLOWED_GITHUB_LOGINS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!allowed.includes((user.login || '').toLowerCase())) {
    return new Response(`GitHub account "${user.login}" is not allowed to edit this app.`, { status: 403 });
  }

  const token = await createSessionToken({ login: user.login, exp: Date.now() + THIRTY_DAYS_MS }, env.SESSION_SECRET);
  const next = cookies.oauth_next ? decodeURIComponent(cookies.oauth_next) : '/';

  const headers = new Headers({ Location: url.origin + next });
  headers.append('Set-Cookie', `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${THIRTY_DAYS_MS / 1000}`);
  headers.append('Set-Cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  headers.append('Set-Cookie', 'oauth_next=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  return new Response(null, { status: 302, headers });
}

export async function handleMe(request, env) {
  const cookies = parseCookies(request);
  const payload = await verifySessionToken(cookies.session, env.SESSION_SECRET);
  return new Response(JSON.stringify({ login: payload?.login ?? null }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleLogout() {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  return new Response(JSON.stringify({ ok: true }), { headers });
}
