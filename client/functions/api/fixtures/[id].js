import { serializeFixture } from '../../_shared/teams.js';
import { verifySessionToken, parseCookies } from '../../_shared/session.js';

const COLUMN_MAP = {
  kickoffTime: 'kickoff_time',
  homeScore: 'home_score',
  awayScore: 'away_score',
  daznAudience: 'dazn_audience',
  skyAudience: 'sky_audience',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPatch({ request, env, params }) {
  const cookies = parseCookies(request);
  const session = await verifySessionToken(cookies.session, env.SESSION_SECRET);
  if (!session) {
    return json({ error: 'Sign in required' }, 401);
  }

  const id = Number(params.id);
  const body = await request.json();

  const setClauses = [];
  const bindings = [];
  for (const [key, column] of Object.entries(COLUMN_MAP)) {
    if (key in body) {
      const value = body[key];
      setClauses.push(`${column} = ?`);
      bindings.push(value === '' || value === undefined ? null : value);
    }
  }

  if (setClauses.length === 0) {
    return json({ error: 'No valid fields provided' }, 400);
  }

  setClauses.push("updated_at = datetime('now')");
  bindings.push(id);

  await env.DB.prepare(`UPDATE fixtures SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...bindings)
    .run();

  const row = await env.DB.prepare('SELECT * FROM fixtures WHERE id = ?').bind(id).first();
  if (!row) return json({ error: 'Fixture not found' }, 404);

  return json(serializeFixture(row));
}
