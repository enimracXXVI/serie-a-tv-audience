// Cup fixtures live in the very same per-season fixtures tab as Serie A rows
// now (see sheets.js/competitions.js's isSerieARow) - moved out of the old
// standalone cupFixtures tab that spanned every season at once, mirroring
// how Serie A itself already gets a fresh tab each rollover. There's no CRUD
// client here anymore (fetch/update/append/delete all go through sheets.js,
// shared with Serie A - see useCupFixtures.js) - this file is now just the
// pure, row-shape-agnostic helpers cup fixtures need on top of that.
//
// `season` is no longer a column on cup fixture rows either - which season a
// row belongs to is now implicit in which tab it was read from, exactly
// like Serie A fixtures never had a `season` column.

export function isCupFixturePlayed(fixture) {
  return fixture.homeScore !== null && fixture.homeScore !== undefined && fixture.awayScore !== null && fixture.awayScore !== undefined;
}

function hasValue(v) {
  return v !== null && v !== undefined && v !== '';
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
// that happen to share a competition/round (season is implicit now - both
// legs always come from the same season's own tab) and the same two clubs
// (home/away swapped between them - the pair is sorted so which leg is
// "leg 1" doesn't matter for grouping). Grouping them live, rather than via
// a manually-typed "tie" id, means there's nothing to remember to fill in
// and nothing to get out of sync - the tradeoff is that it depends on
// `round` being spelled identically on both legs (see README).
export function tieKeyFor(fixture) {
  const pair = [fixture.home.slug, fixture.away.slug].sort().join('~');
  return `${fixture.competition}|${fixture.round}|${pair}`;
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
