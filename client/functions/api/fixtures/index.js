import { serializeFixture, slugFor } from '../../_shared/teams.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const teamsParam = url.searchParams.get('teams');

  const { results } = await env.DB.prepare('SELECT * FROM fixtures ORDER BY matchday, id').all();
  let rows = results;

  if (teamsParam) {
    const wanted = new Set(teamsParam.split(',').filter(Boolean));
    rows = rows.filter((r) => wanted.has(slugFor(r.home_team)) || wanted.has(slugFor(r.away_team)));
  }

  return new Response(JSON.stringify(rows.map(serializeFixture)), {
    headers: { 'Content-Type': 'application/json' },
  });
}
