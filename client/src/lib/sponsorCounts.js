// Tallies, per club, how many currently-loaded fixtures have each
// sponsorship flag checked - used to cap further checkboxes once a club's
// Settings-configured count (matchdaySponsors/playerMascots/walkabouts) is
// already reached.
export const SPONSOR_TYPES = [
  { fixtureKey: 'MatchdaySponsor', capField: 'matchdaySponsors', label: 'Matchday sponsor' },
  { fixtureKey: 'PlayerMascot', capField: 'playerMascots', label: 'Player mascot' },
  { fixtureKey: 'Walkabout', capField: 'walkabouts', label: 'Walkabout' },
];

export function computeSponsorCounts(fixtures) {
  const counts = {};
  function bump(slug, capField) {
    if (!slug) return;
    if (!counts[slug]) counts[slug] = { matchdaySponsors: 0, playerMascots: 0, walkabouts: 0 };
    counts[slug][capField] += 1;
  }
  for (const f of fixtures) {
    for (const side of ['home', 'away']) {
      for (const { fixtureKey, capField } of SPONSOR_TYPES) {
        if (f[`${side}${fixtureKey}`]) bump(f[side]?.slug, capField);
      }
    }
  }
  return counts;
}
