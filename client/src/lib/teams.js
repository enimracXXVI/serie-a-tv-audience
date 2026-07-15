import teamsData from '../data/teams.json';

export const teams = teamsData;
export const teamByName = new Map(teams.map((t) => [t.name, t]));

export function enrichFixture(raw) {
  return {
    id: raw.id,
    matchday: raw.matchday,
    day: raw.day,
    date: raw.date,
    kickoffTime: raw.kickoffTime,
    home: teamByName.get(raw.home) ?? { name: raw.home },
    away: teamByName.get(raw.away) ?? { name: raw.away },
    homeScore: raw.homeScore,
    awayScore: raw.awayScore,
    daznAudience: raw.daznAudience,
    skyAudience: raw.skyAudience,
    onSky: raw.onSky,
    addedTime1H: raw.addedTime1H,
    addedTime2H: raw.addedTime2H,
    daznSimulcastAudience: raw.daznSimulcastAudience,
    updatedAt: raw.updatedAt,
  };
}
