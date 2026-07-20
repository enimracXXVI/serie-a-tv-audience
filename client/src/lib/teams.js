import teamsData from '../data/teams.json';

export const teams = teamsData;

// A past-season fixture can name a club that's no longer (or wasn't yet) in
// the current 20-club roster - relegated/promoted since. There's no team
// record for it, so it needs a stable synthetic slug of its own (rather than
// staying slug-less) so per-team metrics can still group its games.
function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Fixtures store home/away as the club's bundled (immutable) name text, so
// matching must stay keyed by that even if a live Settings edit renames the
// club for display - see useTeams.js's `staticName`.
export function enrichFixture(raw, teamByName) {
  return {
    id: raw.id,
    matchday: raw.matchday,
    day: raw.day,
    date: raw.date,
    kickoffTime: raw.kickoffTime,
    home: teamByName.get(raw.home) ?? { name: raw.home, slug: slugify(raw.home), short: String(raw.home).slice(0, 3).toUpperCase() },
    away: teamByName.get(raw.away) ?? { name: raw.away, slug: slugify(raw.away), short: String(raw.away).slice(0, 3).toUpperCase() },
    homeScore: raw.homeScore,
    awayScore: raw.awayScore,
    daznAudience: raw.daznAudience,
    skyAudience: raw.skyAudience,
    onSky: raw.onSky,
    addedTime1H: raw.addedTime1H,
    addedTime2H: raw.addedTime2H,
    daznSimulcastAudience: raw.daznSimulcastAudience,
    homeMatchdaySponsor: raw.homeMatchdaySponsor,
    homePlayerMascot: raw.homePlayerMascot,
    homeWalkabout: raw.homeWalkabout,
    awayMatchdaySponsor: raw.awayMatchdaySponsor,
    awayPlayerMascot: raw.awayPlayerMascot,
    awayWalkabout: raw.awayWalkabout,
    updatedAt: raw.updatedAt,
  };
}

// The current 20-club roster isn't necessarily who played in a past season -
// promoted/relegated clubs since then would otherwise be left out of any
// per-club computation over that season's fixtures. Derives the real club
// list straight from the fixtures themselves instead.
export function teamsInFixtures(fixtures) {
  return [...new Map(fixtures.flatMap((f) => [f.home, f.away]).map((t) => [t.slug, t])).values()];
}
