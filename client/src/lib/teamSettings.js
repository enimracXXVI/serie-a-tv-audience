import { SPREADSHEET_ID, GOOGLE_API_KEY, TEAMS_SHEET_NAME } from './config.js';
import { columnIndexToLetter, buildHeaderIndex, cell } from './sheetsCommon.js';

const NUMERIC_FIELDS = new Set(['matchdaySponsors', 'playerMascots', 'walkabouts']);
const BOOLEAN_FIELDS = new Set(['sponsored']);
const EDITABLE_FIELDS = [
  'name',
  'short',
  'primary',
  'secondary',
  'crestUrl',
  'sponsored',
  'matchdaySponsors',
  'playerMascots',
  'walkabouts',
];

const FULL_RANGE = `${TEAMS_SHEET_NAME}!A1:Z200`;

// Teams aren't addressed by a numeric id like fixtures are, so we cache the
// row each slug was found on the last time we fetched, and the header
// layout, so a save doesn't need its own read round-trip.
let headerIndexCache = null;
let rowIndexCache = null;

// UNFORMATTED_VALUE can't compute an =IMAGE("url") formula down to a plain
// value (it just comes back blank), so a crestUrl cell holding that formula
// needs a second, FORMULA-rendered read to recover the URL. Plain pasted
// URLs pass through both ways unchanged, so this also stays backward
// compatible with just typing a link straight into the cell.
function extractImageUrl(raw) {
  if (typeof raw !== 'string') return raw ?? null;
  const trimmed = raw.trim();
  const match = trimmed.match(/^=image\(\s*"([^"]*)"/i);
  if (match) return match[1] || null;
  return trimmed || null;
}

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

  let crestFormulas = [];
  if (headerIndex.crestUrl !== undefined && dataRows.length > 0) {
    const letter = columnIndexToLetter(headerIndex.crestUrl);
    const crestRange = `${TEAMS_SHEET_NAME}!${letter}2:${letter}${dataRows.length + 1}`;
    try {
      const crestRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
          crestRange
        )}?key=${GOOGLE_API_KEY}&valueRenderOption=FORMULA&_=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (crestRes.ok) {
        const crestData = await crestRes.json();
        crestFormulas = (crestData.values || []).map((r) => cell(r, 0));
      }
    } catch {
      // non-fatal - falls back to the plain UNFORMATTED_VALUE reading below
    }
  }

  const bySlug = {};
  const rowIndex = {};
  dataRows.forEach((row, i) => {
    const slug = cell(row, headerIndex.slug);
    if (!slug) return;
    const obj = {};
    for (const [key, idx] of Object.entries(headerIndex)) {
      let value = cell(row, idx);
      if (key === 'crestUrl') {
        value = extractImageUrl(crestFormulas[i]) ?? value;
      } else if (BOOLEAN_FIELDS.has(key)) {
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

async function postBatchUpdate(valueInputOption, data, accessToken) {
  if (data.length === 0) return;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ valueInputOption, data }),
  });
  if (res.status === 401 || res.status === 403) throw new Error('UNAUTHENTICATED');
  if (!res.ok) throw new Error('Failed to save team settings');
}

export async function updateTeamSettings(slug, fields, accessToken) {
  if (!headerIndexCache || !rowIndexCache?.[slug]) {
    throw new Error('Team settings have not loaded yet - reopen Settings and try again.');
  }
  const rowNumber = rowIndexCache[slug];

  // crestUrl is written as an =IMAGE("url") formula (needs USER_ENTERED so
  // Sheets parses it as a formula and actually shows the picture in the
  // cell) - everything else is a plain literal (RAW). Sheets' batchUpdate
  // takes one valueInputOption per call, so these need two separate posts.
  const rawData = [];
  const formulaData = [];
  const missing = [];
  for (const field of Object.keys(fields)) {
    if (!EDITABLE_FIELDS.includes(field)) continue;
    const colIdx = headerIndexCache[field];
    if (colIdx === undefined) {
      missing.push(field);
      continue;
    }
    const letter = columnIndexToLetter(colIdx);
    const range = `${TEAMS_SHEET_NAME}!${letter}${rowNumber}:${letter}${rowNumber}`;
    if (field === 'crestUrl') {
      const imageUrl = fields[field];
      const value = imageUrl ? `=IMAGE("${imageUrl.replace(/"/g, '""')}")` : '';
      formulaData.push({ range, majorDimension: 'ROWS', values: [[value]] });
    } else {
      const value = BOOLEAN_FIELDS.has(field) ? Boolean(fields[field]) : fields[field] ?? '';
      rawData.push({ range, majorDimension: 'ROWS', values: [[value]] });
    }
  }

  if (rawData.length === 0 && formulaData.length === 0) {
    throw new Error('No matching column headers found in the teams sheet - check row 1 has the expected labels');
  }

  await postBatchUpdate('RAW', rawData, accessToken);
  await postBatchUpdate('USER_ENTERED', formulaData, accessToken);

  if (missing.length > 0) {
    console.warn(`Teams sheet is missing header(s) for: ${missing.join(', ')} - those fields were not saved.`);
  }

  return fields;
}
