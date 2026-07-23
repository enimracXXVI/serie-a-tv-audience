import { createSheetTabClient } from './sheetTab.js';

// One row per (season, club) - sponsored/bigClub/derbyRival plus the
// sponsor-activation caps (matchdaySponsors/playerMascots/walkabouts), for
// EVERY season including the current one. Replaces the old split where
// these fields lived directly on the `teams` tab for the current season
// only, with a separate archive-only tab for past seasons - one mechanism
// for both now, since a club's sponsorship/big-match/derby status was never
// really a permanent attribute of the club, it's a per-season fact.
//
// This tab also has its own `id` column (an ID00001-style reference,
// auto-filled on every new row for the user's own bookkeeping - see
// bookkeepingIdField) - the app's own row key is the `slug` column, which
// holds the composite `season::team` string (e.g. `26/27::cagliari`);
// `team` holds the club's own `teams`-tab slug. `derbyRival` is a team slug
// too, not a name - no resolution step needed since every club has a
// reliable slug.
const client = createSheetTabClient({
  sheetName: 'teamSeasons',
  idField: 'slug',
  autoIncrementId: false,
  bookkeepingIdField: 'id',
  booleanFields: ['sponsored', 'bigClub', 'addedTimeLed', 'penaltyLed', 'goalCarpet'],
  numericFields: ['matchdaySponsors', 'playerMascots', 'walkabouts', 'ledMinutes', 'ledStartMatchday', 'goalCarpetStartMatchday'],
});

export const fetchTeamSeasons = client.fetchAll;
export const updateTeamSeason = client.updateRow;
export const createTeamSeason = client.appendRow;

export function makeId(season, teamSlug) {
  return `${season}::${teamSlug}`;
}
