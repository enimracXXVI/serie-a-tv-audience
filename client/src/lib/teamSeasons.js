import { createSheetTabClient } from './sheetTab.js';

// One row per (season, club) - sponsored/bigClub/derbyRival plus the
// sponsor-activation caps (matchdaySponsors/playerMascots/walkabouts), for
// EVERY season including the current one. Replaces the old split where
// these fields lived directly on the `teams` tab for the current season
// only, with a separate archive-only tab for past seasons - one mechanism
// for both now, since a club's sponsorship/big-match/derby status was never
// really a permanent attribute of the club, it's a per-season fact.
//
// `slug` (not name) identifies the club - see clubs.js/teams.js for why
// slug is the universal key now. `derbyRival` is a slug too, not a name -
// no resolution step needed since every club has a reliable slug.
const client = createSheetTabClient({
  sheetName: 'teamSeasons',
  idField: 'id',
  autoIncrementId: false,
  booleanFields: ['sponsored', 'bigClub'],
  numericFields: ['matchdaySponsors', 'playerMascots', 'walkabouts'],
});

export const fetchTeamSeasons = client.fetchAll;
export const updateTeamSeason = client.updateRow;
export const createTeamSeason = client.appendRow;

export function makeId(season, slug) {
  return `${season}::${slug}`;
}
