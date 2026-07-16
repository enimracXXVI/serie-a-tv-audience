import { SPREADSHEET_ID, SHEET_NAME, GOOGLE_API_KEY } from './config.js';
import { columnIndexToLetter, buildHeaderIndex, cell } from './sheetsCommon.js';
import { computeMatchTags } from './matchTags.js';

const NUMERIC_FIELDS = new Set([
  'id',
  'matchday',
  'homeScore',
  'awayScore',
  'daznAudience',
  'skyAudience',
  'addedTime1H',
  'addedTime2H',
  'daznSimulcastAudience',
]);
const BOOLEAN_FIELDS = new Set([
  'onSky',
  'homeMatchdaySponsor',
  'homePlayerMascot',
  'homeWalkabout',
  'awayMatchdaySponsor',
  'awayPlayerMascot',
  'awayWalkabout',
  'isBigMatch',
  'isDerby',
]);
const EDITABLE_FIELDS = [
  'date',
  'day',
  'homeScore',
  'awayScore',
  'daznAudience',
  'skyAudience',
  'kickoffTime',
  'onSky',
  'addedTime1H',
  'addedTime2H',
  'daznSimulcastAudience',
  'homeMatchdaySponsor',
  'homePlayerMascot',
  'homeWalkabout',
  'awayMatchdaySponsor',
  'awayPlayerMascot',
  'awayWalkabout',
  'isBigMatch',
  'isDerby',
];

// Generous range: columns can be reordered/added by name (see rowToFixture),
// rows must stay in seeded order (row N+1 holds fixture id N).
const FULL_RANGE = `${SHEET_NAME}!A1:Z500`;

// Cached after the first successful fetch so writes don't need their own
// header lookup round-trip.
let headerIndexCache = null;

function excelSerialToISODate(serial) {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86400000).toISOString().slice(0, 10);
}

function rowToFixture(row, headerIndex) {
  const obj = {};
  for (const [key, idx] of Object.entries(headerIndex)) {
    let value = cell(row, idx);
    if (key === 'date' && typeof value === 'number') {
      value = excelSerialToISODate(value);
    } else if (BOOLEAN_FIELDS.has(key)) {
      value = value === true || value === 'TRUE';
    } else if (NUMERIC_FIELDS.has(key) && value !== null) {
      value = Number(value);
    }
    obj[key] = value;
  }
  return obj;
}

export async function fetchFixtures() {
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
    throw new Error(`Failed to load fixtures (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  const data = await res.json();
  const rows = data.values || [];
  const [headerRow, ...dataRows] = rows;
  const headerIndex = buildHeaderIndex(headerRow);
  headerIndexCache = headerIndex;
  return dataRows.filter((r) => r.length > 0 && r[headerIndex.id] !== undefined).map((r) => rowToFixture(r, headerIndex));
}

async function ensureHeaderIndex() {
  if (headerIndexCache) return headerIndexCache;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    `${SHEET_NAME}!1:1`
  )}?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to read sheet header row');
  const data = await res.json();
  headerIndexCache = buildHeaderIndex((data.values && data.values[0]) || []);
  return headerIndexCache;
}

export async function updateFixtureRow(fixture, accessToken) {
  const headerIndex = await ensureHeaderIndex();
  const rowNumber = Number(fixture.id) + 1; // header occupies row 1
  const updatedAt = new Date().toISOString();
  const patch = { ...fixture, updatedAt };

  const data = [];
  const missing = [];
  for (const field of [...EDITABLE_FIELDS, 'updatedAt']) {
    const colIdx = headerIndex[field];
    if (colIdx === undefined) {
      missing.push(field);
      continue;
    }
    const letter = columnIndexToLetter(colIdx);
    const value = BOOLEAN_FIELDS.has(field) ? Boolean(patch[field]) : patch[field] ?? '';
    data.push({
      range: `${SHEET_NAME}!${letter}${rowNumber}:${letter}${rowNumber}`,
      majorDimension: 'ROWS',
      values: [[value]],
    });
  }

  if (data.length === 0) {
    throw new Error('No matching column headers found in the sheet - check row 1 has the expected labels');
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
  if (!res.ok) throw new Error('Failed to save to Google Sheets');
  if (missing.length > 0) {
    console.warn(`Sheet is missing header(s) for: ${missing.join(', ')} - those fields were not saved.`);
  }

  return { ...fixture, updatedAt };
}

// isBigMatch/isDerby also get written opportunistically whenever a fixture is
// otherwise edited (see EDITABLE_FIELDS above), but that only reaches rows
// someone happens to touch. This does every currently-loaded fixture in one
// go, so the sheet is a complete, queryable mirror of what Settings computes
// right after configuring bigClub/derbyRival, not just the rows someone
// happened to edit.
export async function syncMatchTags(fixtures, accessToken) {
  const headerIndex = await ensureHeaderIndex();
  const bigIdx = headerIndex.isBigMatch;
  const derbyIdx = headerIndex.isDerby;
  if (bigIdx === undefined && derbyIdx === undefined) {
    throw new Error('Sheet is missing isBigMatch/isDerby column headers - see README.');
  }

  const data = [];
  for (const fixture of fixtures) {
    const rowNumber = Number(fixture.id) + 1;
    const { isBigMatch, isDerby } = computeMatchTags(fixture);
    if (bigIdx !== undefined) {
      const letter = columnIndexToLetter(bigIdx);
      data.push({ range: `${SHEET_NAME}!${letter}${rowNumber}:${letter}${rowNumber}`, majorDimension: 'ROWS', values: [[isBigMatch]] });
    }
    if (derbyIdx !== undefined) {
      const letter = columnIndexToLetter(derbyIdx);
      data.push({ range: `${SHEET_NAME}!${letter}${rowNumber}:${letter}${rowNumber}`, majorDimension: 'ROWS', values: [[isDerby]] });
    }
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
  if (!res.ok) throw new Error('Failed to sync tags to Google Sheets');
  return fixtures.length;
}
