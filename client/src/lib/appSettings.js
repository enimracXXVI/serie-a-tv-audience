import { createSheetTabClient } from './sheetTab.js';

// A small singleton tab (one row) for app-wide branding settings that don't
// belong to any one club/broadcaster/competition - currently just the Serie A
// logo shown on the Fixtures/Standings headers. `id` is always the same
// constant value since there's only ever one row.
const client = createSheetTabClient({ sheetName: 'appSettings', idField: 'id', autoIncrementId: false });

export const fetchAppSettings = client.fetchAll;
export const updateAppSettings = client.updateRow;
export const createAppSettings = client.appendRow;

export const APP_SETTINGS_ID = 'global';
