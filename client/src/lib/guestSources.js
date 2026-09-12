import { createSheetTabClient } from './sheetTab.js';

// A small user-maintained list ("Content creator", "Partner", ...) so a
// hospitality guest's origin can be picked from a search-as-you-type list
// (see GuestForm's SearchSelect) instead of typed freehand - same shape as
// broadcasters.js. Keyed by `slug` so a category can be renamed without
// breaking guest rows that already reference it.
const client = createSheetTabClient({
  sheetName: 'guestSources',
  idField: 'slug',
  autoIncrementId: false,
  bookkeepingIdField: 'id',
  // Drives whether GuestForm asks for an Instagram handle at all - a flag
  // on the category itself rather than hardcoding a check against
  // "Content creator" by name, so a future category (or a rename) can opt
  // into the same behavior from Settings without a code change.
  booleanFields: ['requiresInstagram'],
});

export const fetchGuestSources = client.fetchAll;
export const updateGuestSource = client.updateRow;
export const addGuestSource = client.appendRow;
export const deleteGuestSource = client.deleteRow;
