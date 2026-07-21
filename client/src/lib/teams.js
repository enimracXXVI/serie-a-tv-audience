import { slugify } from './clubs.js';

// A truly unrecognized club (typo, or a row that hasn't been added to the
// unified "teams" tab yet) still needs *something* to render - a plain
// short-code/grey placeholder, same as always. `raw` here is whatever text
// the fixture cell actually held (a slug for anything created after the
// slug-based rewrite, a name for anything written before it) - used as both
// the display name and the slug fallback since there's nothing better to
// go on.
function unknownClubFallback(raw) {
  return {
    name: raw,
    slug: slugify(raw),
    short: String(raw).slice(0, 3).toUpperCase(),
    crestUrl: null,
    primary: null,
    secondary: null,
  };
}

// Resolves a fixture's home/away cell text to a full club object. Slug is
// tried first (every fixture created after the unified "teams" tab shipped
// writes a slug), falling back to a name-text match (every fixture written
// before that, plus a legacy row that's never had its home/away cell
// rewritten) - so a club can be renamed going forward without a mass
// rewrite of `fixtures`/`cupFixtures`/archive tabs. See clubs.js/README for
// the full reasoning.
export function resolveClub(raw, clubsBySlug, clubsByName) {
  return clubsBySlug.get(raw) ?? clubsByName?.get(raw) ?? unknownClubFallback(raw);
}

// Fixtures store home/away as whatever text was picked at creation time
// (slug going forward, name text for anything older) - resolveClub handles
// either. `sponsored`/`bigClub`/`derbyRival`/the sponsor-activation caps are
// NOT part of a resolved club object here - those are season-scoped and
// applied afterwards by applySeasonTeamAttributes, for every season
// including the current one.
export function enrichFixture(raw, clubsBySlug, clubsByName) {
  return {
    id: raw.id,
    matchday: raw.matchday,
    day: raw.day,
    date: raw.date,
    kickoffTime: raw.kickoffTime,
    home: resolveClub(raw.home, clubsBySlug, clubsByName),
    away: resolveClub(raw.away, clubsBySlug, clubsByName),
    homeScore: raw.homeScore,
    awayScore: raw.awayScore,
    daznAudience: raw.daznAudience,
    skyAudience: raw.skyAudience,
    // A broadcaster's slug (matching a row in the `broadcasters` tab) if this
    // game is also shown somewhere besides the main broadcaster, blank/null
    // otherwise - see BroadcastersPanel for how "main" is configured.
    otherBroadcaster: raw.otherBroadcaster || null,
    addedTime1H: raw.addedTime1H,
    addedTime2H: raw.addedTime2H,
    daznSimulcastAudience: raw.daznSimulcastAudience,
    homeMatchdaySponsor: raw.homeMatchdaySponsor,
    homePlayerMascot: raw.homePlayerMascot,
    homeWalkabout: raw.homeWalkabout,
    awayMatchdaySponsor: raw.awayMatchdaySponsor,
    awayPlayerMascot: raw.awayPlayerMascot,
    awayWalkabout: raw.awayWalkabout,
    // LED perimeter-board tracking - Serie A and Coppa Italia (up to the
    // semifinals) home games (see FixtureRow's/CupFixtureRow's LED tab).
    extraLedMinutes: raw.extraLedMinutes,
    penaltyTaken: raw.penaltyTaken,
    // Cup-only fields (see cupFixtures.js) - undefined/blank on a Serie A
    // row, left here rather than in a separate enrichment function since
    // both row types now come from the exact same tab/raw shape.
    competition: raw.competition || null,
    round: raw.round || null,
    neutralVenue: raw.neutralVenue,
    broadcaster: raw.broadcaster || null,
    audience: raw.audience,
    etHomeScore: raw.etHomeScore,
    etAwayScore: raw.etAwayScore,
    penHomeScore: raw.penHomeScore,
    penAwayScore: raw.penAwayScore,
    updatedAt: raw.updatedAt,
  };
}

// The current 20-club roster isn't necessarily who played in a past season -
// promoted/relegated clubs since then would otherwise be left out of any
// per-club computation over that season's fixtures. Derives the real club
// list straight from the fixtures themselves instead - alphabetical, not
// fixture-appearance order (which is arbitrary and depends on how the
// archive tab happens to be sorted).
export function teamsInFixtures(fixtures) {
  return [...new Map(fixtures.flatMap((f) => [f.home, f.away]).map((t) => [t.slug, t])).values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

// sponsored/bigClub/derbyRival/matchdaySponsors/playerMascots/walkabouts
// live on the `teamSeasons` tab, one row per (season, club) - a club with no
// row for a given season defaults to not-sponsored/not-big/no-derby/no caps,
// by construction (there's no fallback to any other season's value). Applied
// to every season now, including the current one - not just archives - so
// `teams` (the unified branding tab) never needs to carry a season dimension
// at all.
//
// derbyRival is stored as a slug directly (clubs are keyed by slug
// everywhere now, so there's no name-to-slug resolution needed here anymore,
// unlike before the unification). Exported separately from
// applySeasonTeamAttributes (below) so useTeams.jsx can apply the exact same
// override to a plain roster list, not just a fixture list's embedded
// home/away objects - both need the current season's sponsored/bigClub/
// derbyRival/caps, since neither the `teams` tab nor a bare club object
// carries them anymore.
export function overrideTeamAttributes(roster, seasonLabel, attributeRows) {
  // teamSeasons' own `slug` column holds the composite `season::team` key
  // (its row-identifying id) - the team's own slug lives in its `team`
  // column instead.
  const rowsBySlug = new Map(
    attributeRows.filter((r) => r.season === seasonLabel).map((r) => [r.team, r])
  );

  return new Map(
    roster.map((team) => {
      const row = rowsBySlug.get(team.slug);
      return [
        team.slug,
        {
          ...team,
          sponsored: Boolean(row?.sponsored),
          bigClub: Boolean(row?.bigClub),
          derbyRival: row?.derbyRival || null,
          matchdaySponsors: row?.matchdaySponsors ?? null,
          playerMascots: row?.playerMascots ?? null,
          walkabouts: row?.walkabouts ?? null,
          // LED perimeter-board deal, this club's home games only that
          // season - ledMinutes is the contracted minutes per home fixture
          // (not a season total, and not a boolean), so "no deal" is
          // null/blank, not zero.
          ledMinutes: row?.ledMinutes ?? null,
          addedTimeLed: Boolean(row?.addedTimeLed),
          penaltyLed: Boolean(row?.penaltyLed),
        },
      ];
    })
  );
}

export function applySeasonTeamAttributes(fixtures, seasonLabel, attributeRows) {
  const roster = teamsInFixtures(fixtures);
  const overridden = overrideTeamAttributes(roster, seasonLabel, attributeRows);

  return fixtures.map((f) => ({
    ...f,
    home: overridden.get(f.home.slug) ?? f.home,
    away: overridden.get(f.away.slug) ?? f.away,
  }));
}
