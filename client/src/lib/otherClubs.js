import { createSheetTabClient } from './sheetTab.js';

// A club that isn't in the current 20-club Serie A roster - a club that
// played Serie A before but not now, a Serie B side in an early Coppa
// Italia round, any European club in a UEFA tie. One tab for every such
// club (replacing the former separate pastTeams/cupTeams tabs, which had
// different shapes for no real reason), keyed by `name` - the same
// immutable text a fixture's home/away column stores, since that's the
// only thing available to match against when enriching a fixture.
//
// `slug` is optional - leave it blank and it's synthesized from the name
// (see teams.js's resolveClubByName/fallbackTeam), same as before this
// field existed. Filling it in yourself is only worth doing if you want a
// specific value (matching a bundled crest SVG's filename, say, or getting
// ahead of a future merge of this tab with `teams`) - most rows never need
// it.
//
// `scope` is 'national' or 'european' - national covers both a past
// Serie A club and a domestic cup opponent (Coppa Italia), european
// covers a UEFA cup opponent. Used to filter which clubs are offered for
// a given competition in the cup fixture form (see competitions.js's own
// `scope` field).
const client = createSheetTabClient({ sheetName: 'otherClubs', idField: 'name', autoIncrementId: false });

export const fetchOtherClubs = client.fetchAll;
export const updateOtherClub = client.updateRow;
export const addOtherClub = client.appendRow;
export const deleteOtherClub = client.deleteRow;
