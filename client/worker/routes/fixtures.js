import { serializeFixture, slugFor } from '../_shared/teams.js';
import { verifySessionToken, parseCookies } from '../_shared/session.js';

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

export async function handleFixturesList(request, env) {
  const url = new URL(request.url);
  const teamsParam = url.searchParams.get('teams');

  const { results } = await env.DB.prepare('SELECT * FROM fixtures ORDER BY matchday, id').all();
  let rows = results;

  if (teamsParam) {
    const wanted = new Set(teamsParam.split(',').filter(Boolean));
    rows = rows.filter((r) => wanted.has(slugFor(r.home_team)) || wanted.has(slugFor(r.away_team)));
  }

  return json(rows.map(serializeFixture));
}

export async function handleFixturePatch(request, env, id) {
  const cookies = parseCookies(request);
  const session = await verifySessionToken(cookies.session, env.SESSION_SECRET);
  if (!session) return json({ error: 'Sign in required' }, 401);

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

  if (setClauses.length === 0) return json({ error: 'No valid fields provided' }, 400);

  setClauses.push("updated_at = datetime('now')");
  bindings.push(Number(id));

  await env.DB.prepare(`UPDATE fixtures SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...bindings)
    .run();

  const row = await env.DB.prepare('SELECT * FROM fixtures WHERE id = ?').bind(Number(id)).first();
  if (!row) return json({ error: 'Fixture not found' }, 404);

  return json(serializeFixture(row));
}
