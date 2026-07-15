import teams from '../../src/data/teams.json';

export { teams };

export const teamByName = new Map(teams.map((t) => [t.name, t]));

export function slugFor(teamName) {
  return teamByName.get(teamName)?.slug;
}

export function serializeFixture(row) {
  return {
    id: row.id,
    matchday: row.matchday,
    day: row.day,
    date: row.date,
    kickoffTime: row.kickoff_time,
    home: teamByName.get(row.home_team) ?? { name: row.home_team },
    away: teamByName.get(row.away_team) ?? { name: row.away_team },
    homeScore: row.home_score,
    awayScore: row.away_score,
    daznAudience: row.dazn_audience,
    skyAudience: row.sky_audience,
    updatedAt: row.updated_at,
  };
}
