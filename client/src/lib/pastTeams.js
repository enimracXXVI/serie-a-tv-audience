import { createSheetTabClient } from './sheetTab.js';

// Branding (crest, colours) for clubs that appear in a fixture but aren't in
// the current 20-club roster - relegated/promoted since, or not yet added
// to teams.json for a season that just started. Keyed by `name` (the same
// immutable text a fixture's home/away column stores), not a separate slug,
// since that's the only thing available to match against when enriching an
// archive fixture.
const client = createSheetTabClient({ sheetName: 'pastTeams', idField: 'name', autoIncrementId: false });

export const fetchPastTeams = client.fetchAll;
export const updatePastTeam = client.updateRow;
export const addPastTeam = client.appendRow;
