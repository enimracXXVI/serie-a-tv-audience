import { SPREADSHEET_ID, GOOGLE_API_KEY } from './config.js';
import { buildHeaderIndex, cell } from './sheetsCommon.js';

// Same parsing rules as sheets.js's rowToFixture (numeric/boolean coercion,
// Excel serial date handling) - kept as its own copy rather than sharing
// code with the live fixtures module, since this path is read-only and
// should never risk the live current-season read/write path.
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

// A past season's fixtures tab has the same shape as the live `fixtures`
// tab (a subset of its columns is fine - sponsor/mascot tracking is a
// current-season-only concept, and header-driven parsing just leaves
// those fields undefined if the archive tab doesn't have them).
export async function fetchSeasonFixtures(tabName) {
  const range = `${tabName}!A1:Z500`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    range
  )}?key=${GOOGLE_API_KEY}&valueRenderOption=UNFORMATTED_VALUE&_=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(
      `Failed to load the "${tabName}" archive tab (${res.status}) - make sure it exists with the same header row as the fixtures tab (see README).`
    );
  }
  const data = await res.json();
  const rows = data.values || [];
  const [headerRow, ...dataRows] = rows;
  const headerIndex = buildHeaderIndex(headerRow || []);
  if (headerIndex.id === undefined) {
    throw new Error(`The "${tabName}" tab is missing an "id" column header - see README.`);
  }
  return dataRows.filter((r) => r.length > 0 && cell(r, headerIndex.id) !== null).map((r) => rowToFixture(r, headerIndex));
}
