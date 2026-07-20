import { createSheetTabClient } from './sheetTab.js';

// A small user-maintained list (name + logo) so a cup fixture's broadcaster
// can be picked from a dropdown and rendered as a consistent badge, instead
// of retyping/mistyping a name per row. name is the key - broadcasters are
// few and rarely renamed, so a separate slug column would be overhead.
const client = createSheetTabClient({ sheetName: 'broadcasters', idField: 'name', autoIncrementId: false });

export const fetchBroadcasters = client.fetchAll;
export const updateBroadcaster = client.updateRow;
export const addBroadcaster = client.appendRow;
