import { SPREADSHEET_ID, GOOGLE_API_KEY, TEAMS_SHEET_NAME } from './config.js';
import { columnIndexToLetter, buildHeaderIndex, cell } from './sheetsCommon.js';

const NUMERIC_FIELDS = new Set(['matchdaySponsors', 'playerMascots', 'walkabouts']);
const BOOLEAN_FIELDS = new Set(['sponsored']);
const EDITABLE_FIELDS = ['name', 'short', 'primary', 'sponsored', 'matchdaySponsors', 'playerMascots', 'walkabouts'];

const FULL_RANGE = `${TEAMS_SHEET_NAME}!A1:Z200`;

// Teams aren't addressed by a numeric id like fixtures are, so we cache the
// row each slug was found on the last time we fetched, and the header
// layout, so a save doesn't need its own read round-trip.
let headerIndexCache = null;
let rowIndexCache = null;

export async function fetchTeamSettings() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    FULL_RANGE
  )}?key=${GOOGLE_API_KEY}&valueRenderOption=UNFORMATTED_VALUE&_=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || '';
    } catch {
      // response wasn't JSON; ignore
    }
    throw new Error(
      `Failed to load team settings (${res.status})${detail ? `: ${detail}` : ''} - make sure the sheet has a "${TEAMS_SHEET_NAME}" tab (see README).`
    );
  }
  const data = await res.json();
  const rows = data.values || [];
  const [headerRow, ...dataRows] = rows;
  const headerIndex = buildHeaderIndex(headerRow);
  if (headerIndex.slug === undefined) {
    throw new Error(`The "${TEAMS_SHEET_NAME}" tab is missing a "slug" column header - see README.`);
  }
  headerIndexCache = headerIndex;

  const bySlug = {};
  const rowIndex = {};
  dataRows.forEach((row, i) => {
    const slug = cell(row, headerIndex.slug);
    if (!slug) return;
    const obj = {};
    for (const [key, idx] of Object.entries(headerIndex)) {
      let value = cell(row, idx);
      if (BOOLEAN_FIELDS.has(key)) {
        value = value === true || value === 'TRUE';
      } else if (NUMERIC_FIELDS.has(key) && value !== null) {
        value = Number(value);
      }
      obj[key] = value;
    }
    bySlug[slug] = obj;
    rowIndex[slug] = i + 2; // header occupies row 1
  });
  rowIndexCache = rowIndex;

  return bySlug;
}

export async function updateTeamSettings(slug, fields, accessToken) {
  if (!headerIndexCache || !rowIndexCache?.[slug]) {
    throw new Error('Team settings have not loaded yet - reopen Settings and try again.');
  }
  const rowNumber = rowIndexCache[slug];

  const data = [];
  const missing = [];
  for (const field of Object.keys(fields)) {
    if (!EDITABLE_FIELDS.includes(field)) continue;
    const colIdx = headerIndexCache[field];
    if (colIdx === undefined) {
      missing.push(field);
      continue;
    }
    const letter = columnIndexToLetter(colIdx);
    const value = BOOLEAN_FIELDS.has(field) ? Boolean(fields[field]) : fields[field] ?? '';
    data.push({
      range: `${TEAMS_SHEET_NAME}!${letter}${rowNumber}:${letter}${rowNumber}`,
      majorDimension: 'ROWS',
      values: [[value]],
    });
  }

  if (data.length === 0) {
    throw new Error('No matching column headers found in the teams sheet - check row 1 has the expected labels');
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ valueInputOption: 'RAW', data }),
  });

  if (res.status === 401 || res.status === 403) throw new Error('UNAUTHENTICATED');
  if (!res.ok) throw new Error('Failed to save team settings');
  if (missing.length > 0) {
    console.warn(`Teams sheet is missing header(s) for: ${missing.join(', ')} - those fields were not saved.`);
  }

  return fields;
}
