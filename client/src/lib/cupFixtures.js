import { createSheetTabClient } from './sheetTab.js';
import { resolveClubByName } from './teams.js';

const client = createSheetTabClient({
  sheetName: 'cupFixtures',
  idField: 'id',
  autoIncrementId: true,
  numericFields: [
    'id',
    'homeScore',
    'awayScore',
    'audience',
    'addedTime1H',
    'addedTime2H',
    'etHomeScore',
    'etAwayScore',
    'penHomeScore',
    'penAwayScore',
  ],
  booleanFields: ['neutralVenue'],
});

export const fetchCupFixturesRaw = client.fetchAll;
export const updateCupFixture = client.updateRow;
export const addCupFixture = client.appendRow;

export function isCupFixturePlayed(fixture) {
  return fixture.homeScore !== null && fixture.homeScore !== undefined && fixture.awayScore !== null && fixture.awayScore !== undefined;
}

function hasValue(v) {
  return v !== null && v !== undefined && v !== '';
}

// Resolves the raw sheet row's home/away club NAMES (not slugs - see the
// module doc below) into full team-like objects, checking the current Serie
// A roster first (live crest/colours/sponsorship), then otherClubs (a club
// that played Serie A before but not now, or one that never has), then a
// plain placeholder. Both sides go through the exact same chain - there's no
// "our club vs opponent" asymmetry, so two Serie A clubs (sponsored or not)
// can meet each other and both resolve correctly, and a fixture doesn't need
// either side to be a club you're specifically tracking.
export function enrichCupFixture(raw, teamByName, otherClubsByName) {
  return {
    ...raw,
    home: resolveClubByName(raw.home, teamByName, otherClubsByName),
    away: resolveClubByName(raw.away, teamByName, otherClubsByName),
  };
}

// A knockout leg's "real" final score - the extra-time score once it went to
// ET (which already includes the 90-minute goals, not additive to them),
// falling back to the regulation score otherwise. Penalties never change the
// scoreline itself, just who goes through when the score above is level.
export function resolveCupFixtureOutcome(fixture) {
  const wentToEt = hasValue(fixture.etHomeScore) && hasValue(fixture.etAwayScore);
  const wentToPens = hasValue(fixture.penHomeScore) && hasValue(fixture.penAwayScore);
  return {
    homeScore: wentToEt ? fixture.etHomeScore : fixture.homeScore,
    awayScore: wentToEt ? fixture.etAwayScore : fixture.awayScore,
    wentToEt,
    wentToPens,
    penHomeScore: fixture.penHomeScore ?? null,
    penAwayScore: fixture.penAwayScore ?? null,
  };
}

// Two-legged ties aren't a separate concept in the sheet - just two rows
// that happen to share a competition/round/season and the same two clubs
// (home/away swapped between them - the pair is sorted so which leg is
// "leg 1" doesn't matter for grouping). Grouping them live, rather than via
// a manually-typed "tie" id, means there's nothing to remember to fill in
// and nothing to get out of sync - the tradeoff is that it depends on
// `round` being spelled identically on both legs (see README).
export function tieKeyFor(fixture) {
  const pair = [fixture.home.slug, fixture.away.slug].sort().join('~');
  return `${fixture.competition}|${fixture.round}|${fixture.season}|${pair}`;
}

// Preserves first-seen order, same as the fixture list itself, so a
// two-legged tie's group appears wherever its first leg would have.
export function groupIntoTies(fixtures) {
  const byKey = new Map();
  for (const f of fixtures) {
    const key = tieKeyFor(f);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(f);
  }
  return [...byKey.values()];
}

// Only meaningful once both legs exist and have been played - null
// otherwise (a first leg alone, or a leg still to be played, has no
// aggregate to show yet). Uses each leg's resolved (post-ET) outcome, since
// an AET score is that leg's actual final score, not an addition to it.
// Tracks the aggregate per CLUB, not per home/away column, since which club
// is "home" flips between legs - teamA is arbitrarily leg 1's home club.
export function computeTieAggregate(legs) {
  if (legs.length !== 2 || !legs.every(isCupFixturePlayed)) return null;
  const teamA = legs[0].home;
  const teamB = legs[0].away;
  let aScore = 0;
  let bScore = 0;
  for (const leg of legs) {
    const outcome = resolveCupFixtureOutcome(leg);
    const homeIsA = leg.home.slug === teamA.slug;
    aScore += Number(homeIsA ? outcome.homeScore : outcome.awayScore) || 0;
    bScore += Number(homeIsA ? outcome.awayScore : outcome.homeScore) || 0;
  }
  const penLeg = legs.find((l) => hasValue(l.penHomeScore) && hasValue(l.penAwayScore));
  let penAScore = null;
  let penBScore = null;
  if (penLeg) {
    const homeIsA = penLeg.home.slug === teamA.slug;
    penAScore = homeIsA ? penLeg.penHomeScore : penLeg.penAwayScore;
    penBScore = homeIsA ? penLeg.penAwayScore : penLeg.penHomeScore;
  }
  return {
    teamA,
    teamB,
    aScore,
    bScore,
    decidedByPens: aScore === bScore && Boolean(penLeg),
    penAScore,
    penBScore,
  };
}
