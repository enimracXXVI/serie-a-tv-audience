import { createSheetTabClient } from './sheetTab.js';

const client = createSheetTabClient({
  sheetName: 'cupFixtures',
  idField: 'id',
  autoIncrementId: true,
  numericFields: [
    'id',
    'ourScore',
    'theirScore',
    'audience',
    'addedTime1H',
    'addedTime2H',
    'etOurScore',
    'etTheirScore',
    'penOurScore',
    'penTheirScore',
  ],
});

export const fetchCupFixturesRaw = client.fetchAll;
export const updateCupFixture = client.updateRow;
export const addCupFixture = client.appendRow;

export function isCupFixturePlayed(fixture) {
  return fixture.ourScore !== null && fixture.ourScore !== undefined && fixture.theirScore !== null && fixture.theirScore !== undefined;
}

function hasValue(v) {
  return v !== null && v !== undefined && v !== '';
}

// A knockout leg's "real" final score - the extra-time score once it went to
// ET (which already includes the 90-minute goals, not additive to them),
// falling back to the regulation score otherwise. Penalties never change the
// scoreline itself, just who goes through when the score above is level.
export function resolveCupFixtureOutcome(fixture) {
  const wentToEt = hasValue(fixture.etOurScore) && hasValue(fixture.etTheirScore);
  const wentToPens = hasValue(fixture.penOurScore) && hasValue(fixture.penTheirScore);
  return {
    ourScore: wentToEt ? fixture.etOurScore : fixture.ourScore,
    theirScore: wentToEt ? fixture.etTheirScore : fixture.theirScore,
    wentToEt,
    wentToPens,
    penOurScore: fixture.penOurScore ?? null,
    penTheirScore: fixture.penTheirScore ?? null,
  };
}

// Two-legged ties aren't a separate concept in the sheet - just two rows
// that happen to share a competition/round/season and the same two clubs
// (home/away swapped between them). Grouping them live, rather than via a
// manually-typed "tie" id, means there's nothing to remember to fill in and
// nothing to get out of sync - the tradeoff is that it depends on `round`
// being spelled identically on both legs (see README).
export function tieKeyFor(fixture) {
  const ourClubSlug = fixture.ourClub?.slug ?? fixture.ourClub;
  const opponentSlug = fixture.opponent?.slug ?? fixture.opponent;
  return `${fixture.competition}|${fixture.round}|${fixture.season}|${ourClubSlug}|${opponentSlug}`;
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
export function computeTieAggregate(legs) {
  if (legs.length !== 2 || !legs.every(isCupFixturePlayed)) return null;
  let ourAgg = 0;
  let theirAgg = 0;
  for (const leg of legs) {
    const outcome = resolveCupFixtureOutcome(leg);
    ourAgg += Number(outcome.ourScore) || 0;
    theirAgg += Number(outcome.theirScore) || 0;
  }
  const penLeg = legs.find((l) => hasValue(l.penOurScore) && hasValue(l.penTheirScore));
  return {
    ourAgg,
    theirAgg,
    decidedByPens: ourAgg === theirAgg && Boolean(penLeg),
    penOurScore: penLeg?.penOurScore ?? null,
    penTheirScore: penLeg?.penTheirScore ?? null,
  };
}

// A stand-in so a row always has something Crest-safe to render even before
// its opponent has been added to the cupTeams roster, or if "ourClub" points
// at a slug that's since been renamed/removed from the main teams tab.
function fallbackTeam(slug, name) {
  return { slug, name: name ?? slug ?? 'Unknown', short: (name ?? slug ?? '???').slice(0, 3).toUpperCase(), crestUrl: null, primary: '#94a3b8', secondary: '#ffffff' };
}

// Resolves the raw sheet row's ourClub/opponent slugs into full team-like
// objects (crest, colours) from the two different rosters they each come
// from, and derives home/away from homeAway so display code can treat this
// the same way it treats a main-fixtures row.
export function enrichCupFixture(raw, teamsBySlug, cupTeamsBySlug) {
  const ourClub = teamsBySlug.get(raw.ourClub) ?? fallbackTeam(raw.ourClub);
  const opponent = cupTeamsBySlug.get(raw.opponent) ?? fallbackTeam(raw.opponent, raw.opponent);
  const isHome = raw.homeAway !== 'away';
  return {
    ...raw,
    ourClub,
    opponent,
    home: isHome ? ourClub : opponent,
    away: isHome ? opponent : ourClub,
  };
}
