import { handleTeams } from './routes/teams.js';
import { handleFixturesList, handleFixturePatch } from './routes/fixtures.js';
import { handleLogin, handleCallback, handleMe, handleLogout } from './routes/auth.js';

function notFound() {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleApi(request, env, pathname) {
  const { method } = request;

  if (pathname === '/api/teams' && method === 'GET') return handleTeams();
  if (pathname === '/api/fixtures' && method === 'GET') return handleFixturesList(request, env);

  const fixtureMatch = pathname.match(/^\/api\/fixtures\/(\d+)$/);
  if (fixtureMatch && method === 'PATCH') return handleFixturePatch(request, env, fixtureMatch[1]);

  if (pathname === '/api/auth/login' && method === 'GET') return handleLogin(request, env);
  if (pathname === '/api/auth/callback' && method === 'GET') return handleCallback(request, env);
  if (pathname === '/api/auth/me' && method === 'GET') return handleMe(request, env);
  if (pathname === '/api/auth/logout' && method === 'POST') return handleLogout();

  return notFound();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url.pathname);
    }

    // Static SPA assets. Fall back to index.html for client-side routes
    // (e.g. /calendar/juventus) that have no matching file.
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404) {
      return env.ASSETS.fetch(new Request(new URL('/', url), request));
    }
    return assetResponse;
  },
};
