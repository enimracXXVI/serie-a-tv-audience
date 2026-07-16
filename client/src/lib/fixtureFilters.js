import { computeMatchTags } from './matchTags.js';

// Shown as toggle chips on branded calendar pages - checked chips narrow the
// fixture list down to matches meeting ANY of the selected criteria.
export const FIXTURE_FILTERS = [
  { key: 'bigMatch', label: 'Big matches', test: (f) => computeMatchTags(f).isBigMatch },
  { key: 'derby', label: 'Derbies', test: (f) => computeMatchTags(f).isDerby },
  {
    key: 'matchdaySponsor',
    label: 'Matchday sponsor',
    test: (f) => Boolean(f.homeMatchdaySponsor || f.awayMatchdaySponsor),
  },
  { key: 'walkabout', label: 'Walkabout', test: (f) => Boolean(f.homeWalkabout || f.awayWalkabout) },
  { key: 'mascot', label: 'Player mascot', test: (f) => Boolean(f.homePlayerMascot || f.awayPlayerMascot) },
];

export function applyFixtureFilters(fixtures, activeKeys) {
  if (activeKeys.length === 0) return fixtures;
  const tests = FIXTURE_FILTERS.filter((f) => activeKeys.includes(f.key)).map((f) => f.test);
  return fixtures.filter((f) => tests.some((test) => test(f)));
}
