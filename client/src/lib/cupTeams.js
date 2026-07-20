import { createSheetTabClient } from './sheetTab.js';

export const CUP_COMPETITIONS = [
  { value: 'CoppaItalia', label: 'Coppa Italia' },
  { value: 'ChampionsLeague', label: 'Champions League' },
  { value: 'EuropaLeague', label: 'Europa League' },
  { value: 'ConferenceLeague', label: 'Conference League' },
];

// Opponents in these competitions aren't limited to the 20-club Serie A
// roster (a Serie B side in an early Coppa Italia round, any European club
// in a UEFA tie) - this is its own small, user-maintained roster rather than
// a lookup into the main teams tab. slug is a user-chosen key (not an
// auto-incrementing id), same idea as the main teams tab.
const client = createSheetTabClient({ sheetName: 'cupTeams', idField: 'slug', autoIncrementId: false });

export const fetchCupTeams = client.fetchAll;
export const updateCupTeam = client.updateRow;
export const addCupTeam = client.appendRow;
