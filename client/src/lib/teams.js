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

// A club not in the current roster still gets its real crest/colours if
// it's been added to the "pastTeams" Settings tab (see usePastTeams.jsx) -
// otherwise it falls back to a plain short-code/grey placeholder, same as
// before that tab existed.
function fallbackTeam(name, pastTeamsByName) {
  const past = pastTeamsByName.get(name);
  return {
    name,
    slug: slugify(name),
    short: past?.short || String(name).slice(0, 3).toUpperCase(),
    crestUrl: past?.crestUrl || null,
    primary: past?.primary || null,
    secondary: past?.secondary || null,
  };
}

// Fixtures store home/away as the club's bundled (immutable) name text, so
// matching must stay keyed by that even if a live Settings edit renames the
// club for display - see useTeams.js's `staticName`.
export function enrichFixture(raw, teamByName, pastTeamsByName = new Map()) {
  return {
    id: raw.id,
    matchday: raw.matchday,
    day: raw.day,
    date: raw.date,
    kickoffTime: raw.kickoffTime,
    home: teamByName.get(raw.home) ?? fallbackTeam(raw.home, pastTeamsByName),
    away: teamByName.get(raw.away) ?? fallbackTeam(raw.away, pastTeamsByName),
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
