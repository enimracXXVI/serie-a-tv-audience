import { createSheetTabClient } from './sheetTab.js';

// A small user-maintained list (name + logo) so a cup fixture's broadcaster
// can be picked from a dropdown and rendered as a consistent badge, instead
// of retyping/mistyping a name per row. Keyed by `slug` (not name) so a
// broadcaster can be renamed without breaking fixtures that already
// reference it - see resolveBroadcaster below.
const client = createSheetTabClient({
  sheetName: 'broadcasters',
  idField: 'slug',
  autoIncrementId: false,
  bookkeepingIdField: 'id',
  booleanFields: ['isMain'],
});

export const fetchBroadcasters = client.fetchAll;
export const updateBroadcaster = client.updateRow;
export const addBroadcaster = client.appendRow;
export const deleteBroadcaster = client.deleteRow;

// Resolves a fixture's `otherBroadcaster`/`broadcaster` cell (a slug for
// anything written after broadcasters became slug-keyed, a name for
// anything written before it) back to a full broadcaster row - same
// slug-first/name-fallback pattern as clubs (see teams.js's resolveClub),
// so existing fixtures need no migration.
export function resolveBroadcaster(raw, broadcasters) {
  if (!raw) return null;
  return broadcasters.find((b) => b.slug === raw) ?? broadcasters.find((b) => b.name === raw) ?? null;
}
