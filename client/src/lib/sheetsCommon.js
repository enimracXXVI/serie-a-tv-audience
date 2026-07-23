// Shared helpers for talking to Google Sheets ranges by header name instead
// of fixed column letters, used by both the fixtures and team-settings data
// layers.

import { SPREADSHEET_ID } from './config.js';

// A tab's numeric sheetId (distinct from its name) is only needed for a
// `:batchUpdate` structural request like deleteDimension - every other call
// in this app addresses ranges by tab name instead. Fetched once per tab
// name and cached module-wide since a tab's sheetId never changes for the
// life of the spreadsheet.
const sheetIdCache = new Map();

export async function getSheetId(sheetName, accessToken) {
  if (sheetIdCache.has(sheetName)) return sheetIdCache.get(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Failed to look up the "${sheetName}" tab while deleting - try again.`);
  const data = await res.json();
  for (const s of data.sheets || []) {
    sheetIdCache.set(s.properties.title, s.properties.sheetId);
  }
  if (!sheetIdCache.has(sheetName)) throw new Error(`No tab named "${sheetName}" found in the spreadsheet.`);
  return sheetIdCache.get(sheetName);
}

export function columnIndexToLetter(index) {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

export function buildHeaderIndex(headerRow) {
  const index = {};
  (headerRow || []).forEach((name, i) => {
    if (name) index[String(name).trim()] = i;
  });
  return index;
}

// A header row is manually typed/edited in the sheet - a column meant to be
// "audience" but typed as "Audience" (or with stray spacing) would otherwise
// silently vanish: buildHeaderIndex keys on the exact header text, so every
// row's value for that column would read as undefined rather than erroring
// loudly. This aliases each expected field name onto whichever header
// actually matches it case-insensitively, so a real column always resolves
// even if its casing doesn't exactly match the code's field name.
export function normalizeHeaderIndex(headerIndex, canonicalFields) {
  const byLowerCase = new Map();
  for (const key of Object.keys(headerIndex)) {
    if (!byLowerCase.has(key.toLowerCase())) byLowerCase.set(key.toLowerCase(), key);
  }
  const result = { ...headerIndex };
  for (const field of canonicalFields) {
    if (result[field] !== undefined) continue;
    const match = byLowerCase.get(field.toLowerCase());
    if (match !== undefined) result[field] = headerIndex[match];
  }
  return result;
}

export function cell(row, index) {
  return row[index] === undefined || row[index] === '' ? null : row[index];
}
