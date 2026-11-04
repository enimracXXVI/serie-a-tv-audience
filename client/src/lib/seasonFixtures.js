import { SPREADSHEET_ID, GOOGLE_API_KEY } from './config.js';
import { buildHeaderIndex, normalizeHeaderIndex, cell } from './sheetsCommon.js';
import { excelSerialToISODate, excelSerialToTime } from './dateFormat.js';

// Same parsing rules as sheets.js's rowToFixture (numeric/boolean coercion,
// Excel serial date handling, via the same shared dateFormat.js helpers) -
// kept as its own copy of rowToFixture itself rather than sharing THAT code
// with the live fixtures module, since this path is read-only and should
// never risk the live current-season read/write path.
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
  // A cup fixture's audience reuses mainAudience above, not a column of its
  // own - see sheets.js's NUMERIC_FIELDS for the full explanation.
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

// Every field this module ever reads by name - see normalizeHeaderIndex's
// use below for why this matters (a header cell typed with different
// casing/spacing than the code expects would otherwise silently read blank).
const ALL_FIXTURE_FIELDS = [
  ...new Set([
    ...NUMERIC_FIELDS,
    ...BOOLEAN_FIELDS,
    'id',
    'matchday',
    'day',
    'date',
    'kickoffTime',
    'home',
    'away',
    'otherBroadcaster',
    'homeMatchdaySponsor',
    'homePlayerMascot',
    'homeWalkabout',
    'awayMatchdaySponsor',
    'awayPlayerMascot',
    'awayWalkabout',
    'competition',
    'round',
  ]),
];

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
  const headerIndex = normalizeHeaderIndex(buildHeaderIndex(headerRow || []), ALL_FIXTURE_FIELDS);
  if (headerIndex.id === undefined) {
    throw new Error(`The "${tabName}" tab is missing an "id" column header - see README.`);
  }
  return dataRows.filter((r) => r.length > 0 && cell(r, headerIndex.id) !== null).map((r) => rowToFixture(r, headerIndex));
}
