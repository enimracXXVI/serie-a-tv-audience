import { createSheetTabClient } from './sheetTab.js';

// A club that isn't in the current 20-club Serie A roster - a club that
// played Serie A before but not now, a Serie B side in an early Coppa
// Italia round, any European club in a UEFA tie. One tab for every such
// club (replacing the former separate pastTeams/cupTeams tabs, which had
// different shapes for no real reason), keyed by `name` - the same
// immutable text a fixture's home/away column stores, since that's the
// only thing available to match against when enriching a fixture. No
// stored slug (same as before) - it's synthesized from the name wherever
// needed (see teams.js's resolveClubByName/fallbackTeam), so there's
// nothing to keep in sync or get wrong.
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
