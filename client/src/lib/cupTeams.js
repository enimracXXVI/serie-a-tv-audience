import { createSheetTabClient } from './sheetTab.js';

// A club not in the current 20-club Serie A roster (a Serie B side in an
// early Coppa Italia round, any European club in a UEFA tie) that ALSO never
// played in the current roster's own history - i.e. one with no branding
// available from the main `teams` tab or `pastTeams` either. Keyed by name,
// same convention as `pastTeams`, since a cup fixture's home/away are club
// name text too (see cupFixtures.js) - there's no separate slug identity to
// maintain in sync.
const client = createSheetTabClient({ sheetName: 'cupTeams', idField: 'name', autoIncrementId: false });

export const fetchCupTeams = client.fetchAll;
export const updateCupTeam = client.updateRow;
export const addCupTeam = client.appendRow;
