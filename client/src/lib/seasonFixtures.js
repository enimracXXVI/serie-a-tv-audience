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
  'mainAudience',
  'otherAudience',
  'addedTime1H',
  'addedTime2H',
  'simulcastAudience',
  'audience',
  'etHomeScore',
  'etAwayScore',
  'penHomeScore',
  'penAwayScore',
  'extraLedMinutes',
]);
const BOOLEAN_FIELDS = new Set([
  'homeMatchdaySponsor',
  'homePlayerMascot',
  'homeWalkabout',
  'awayMatchdaySponsor',
  'awayPlayerMascot',
  'awayWalkabout',
  'isBigMatch',
  'isDerby',
  'neutralVenue',
  'penaltyTaken',
]);

function excelSerialToISODate(serial) {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86400000).toISOString().slice(0, 10);
}

// Typing a time like "20:45" straight into a cell makes Sheets store it as a
// real TIME value (a fraction-of-day serial, e.g. 0.864583) rather than
// text - UNFORMATTED_VALUE then returns that number instead of a string.
function excelSerialToTime(serial) {
  const totalMinutes = Math.round(serial * 24 * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Manually-typed archive data can hold "true"/"True"/" TRUE " instead of a
// real checkbox or an exact-cased "TRUE" string - match leniently rather
// than silently treating anything but an exact match as false.
function isTruthyCell(value) {
  return value === true || (typeof value === 'string' && value.trim().toUpperCase() === 'TRUE');
}

function rowToFixture(row, headerIndex) {
  const obj = {};
  for (const [key, idx] of Object.entries(headerIndex)) {
    let value = cell(row, idx);
    if (key === 'date' && typeof value === 'number') {
      value = excelSerialToISODate(value);
    } else if (key === 'kickoffTime' && typeof value === 'number') {
      value = excelSerialToTime(value);
    } else if (BOOLEAN_FIELDS.has(key)) {
      value = isTruthyCell(value);
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
  // Unbounded column width - see fetchFixtures in sheets.js for why a fixed
  // column-letter cap silently truncates a wide header row.
  const range = `${tabName}!1:500`;
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
