import { verifySessionToken, parseCookies } from '../../_shared/session.js';

export async function onRequestGet({ request, env }) {
  const cookies = parseCookies(request);
  const payload = await verifySessionToken(cookies.session, env.SESSION_SECRET);
  return new Response(JSON.stringify({ login: payload?.login ?? null }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
