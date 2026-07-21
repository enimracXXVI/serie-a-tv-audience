import { createSheetTabClient } from './sheetTab.js';

// A club that isn't in the current 20-club Serie A roster - a club that
// played Serie A before but not now, a Serie B side in an early Coppa
// Italia round, any European club in a UEFA tie. One tab for every such
// club (replacing the former separate pastTeams/cupTeams tabs, which had
// different shapes for no real reason), keyed by `name` - the same
// immutable text a fixture's home/away column stores, since that's the
// only thing available to match against when enriching a fixture.
//
// `slug` is written automatically (derived from the name) whenever a club is
// added through the app, so it's never actually blank in a row this app
// created itself - a row hand-typed straight into the sheet can still leave
// it blank, which falls back to the same derivation at read time (see
// teams.js's resolveClubByName/fallbackTeam). Since it's meant to be a
// stable key (ahead of a future merge of this tab with `teams`), only
// override it if you specifically need a different value.
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
