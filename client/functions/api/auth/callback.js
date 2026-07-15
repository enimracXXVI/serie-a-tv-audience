import { createSessionToken, parseCookies } from '../../_shared/session.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function onRequestGet({ request, env }) {
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
