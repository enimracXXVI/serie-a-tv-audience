import { SPREADSHEET_ID, GOOGLE_API_KEY } from './config.js';
import { columnIndexToLetter, buildHeaderIndex, normalizeHeaderIndex, cell, getSheetId } from './sheetsCommon.js';
import { computeMatchTags } from './matchTags.js';
import { computeDayOfWeek } from './matchdays.js';

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
  // Cup-only fields - blank on every Serie A row (see isSerieARow in
  // competitions.js for how a row is told apart).
  'audience',
  'etHomeScore',
  'etAwayScore',
  'penHomeScore',
  'penAwayScore',
  // LED perimeter-board tracking, home games only (same "home game only"
  // scope as the matchday sponsor/mascot/walkabout fields below) - Serie A
  // plus Coppa Italia up to the semifinals (its final is a neutral-venue
  // match, so it's excluded the same way any neutralVenue row is - see
  // CupFixtureRow's cupFixtureHasLed).
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
const EDITABLE_FIELDS = [
  'date',
  'day',
  'homeScore',
  'awayScore',
  'mainAudience',
  'otherAudience',
  'kickoffTime',
  'otherBroadcaster',
  'addedTime1H',
  'addedTime2H',
  'simulcastAudience',
  'homeMatchdaySponsor',
  'homePlayerMascot',
  'homeWalkabout',
  'awayMatchdaySponsor',
  'awayPlayerMascot',
  'awayWalkabout',
  'isBigMatch',
  'isDerby',
  // Cup-only, edited post-creation from a cup fixture's own edit tabs -
  // competition/round/home/away aren't here, same as matchday/home/away
  // above: set once at creation, never edited afterwards. Broadcaster(s)
  // reuse otherBroadcaster (above) rather than a separate column - see
  // resolveBroadcasterList for the comma-separated-list parsing that field's
  // cup rows get.
  'neutralVenue',
  'audience',
  'etHomeScore',
  'etAwayScore',
  'penHomeScore',
  'penAwayScore',
  // LED perimeter-board tracking, home games only - Serie A plus Coppa
  // Italia up to the semifinals (see the NUMERIC_FIELDS comment above).
  'extraLedMinutes',
  'penaltyTaken',
];

// Every field this module ever reads or writes by name - used to alias a
// header cell typed with different casing/spacing (e.g. "Audience" instead
// of "audience") back onto the exact field name the app expects (see
// normalizeHeaderIndex) - without this, that column's value would silently
// read as blank/0 on every row instead of erroring loudly.
const ALL_FIXTURE_FIELDS = [
  ...new Set([...NUMERIC_FIELDS, ...BOOLEAN_FIELDS, ...EDITABLE_FIELDS, 'id', 'matchday', 'home', 'away', 'competition', 'round', 'updatedAt']),
];

// Every function here takes the live season's tab name explicitly (from
// useSeasons()'s currentSeason.tab) rather than a hardcoded constant - the
// tab holding the current season's fixtures is renamed every season rollover
// (e.g. fixtures_26_27 -> fixtures_27_28), driven entirely by the `seasons`
// sheet tab now, not a value baked into the code.
//
// This same tab now holds BOTH Serie A fixtures and cup fixtures for that
// season (moved out of the old, all-seasons-in-one standalone cupFixtures
// tab) - a row's `competition` cell tells the two apart (see isSerieARow in
// competitions.js). The field lists above are the union of both shapes;
// whichever half doesn't apply to a given row is just left blank.

// Cached after the first successful fetch so writes don't need their own
// header lookup round-trip. Only ever holds one tab's worth of state at a
// time - safe because this file is only ever used for whichever season is
// currently live within a given page load.
let headerIndexCache = null;
// id -> row number, same convention as sheetTab.js's generic client. Kept in
// sync with reality by deleteFixtureRow refetching after an actual delete -
// see there for why "row N+1 holds fixture id N" can no longer be assumed.
let rowIndexCache = null;

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

// Manually-typed data can hold "true"/"True"/" TRUE " instead of a real
// checkbox or an exact-cased "TRUE" string - match leniently rather than
// silently treating anything but an exact match as false.
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

export async function fetchFixtures(sheetName) {
  // Unbounded column width (just a row range) - a fixed column-letter cap
  // like A1:Z500 silently truncates the header read the moment a tab grows
  // past column Z (26 columns), which this one has (34+ fields) - any field
  // past that point would read back as "missing" even though it's really
  // there, just further right than the fetch ever looked.
  const range = `${sheetName}!1:500`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    range
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
  const headerIndex = normalizeHeaderIndex(buildHeaderIndex(headerRow), ALL_FIXTURE_FIELDS);
  headerIndexCache = headerIndex;

  const rowIndex = {};
  const fixtures = [];
  dataRows.forEach((row, i) => {
    if (row.length === 0 || row[headerIndex.id] === undefined) return;
    const fixture = rowToFixture(row, headerIndex);
    fixtures.push(fixture);
    rowIndex[fixture.id] = i + 2; // header occupies row 1
  });
  rowIndexCache = rowIndex;
  return fixtures;
}

// Sibling season archive tabs share the same header row as the live
// fixtures tab, but aren't guaranteed to have columns in the exact same
// order - a fresh lookup per tab (rather than reusing the cache above)
// keeps syncing tags to an archive tab safe even if that ever drifts.
async function fetchHeaderIndexFor(tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    `${tabName}!1:1`
  )}?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to read the "${tabName}" tab's header row`);
  const data = await res.json();
  return normalizeHeaderIndex(buildHeaderIndex((data.values && data.values[0]) || []), ALL_FIXTURE_FIELDS);
}

export async function updateFixtureRow(fixture, accessToken, sheetName) {
  if (!headerIndexCache) headerIndexCache = await fetchHeaderIndexFor(sheetName);
  const headerIndex = headerIndexCache;
  if (!rowIndexCache || rowIndexCache[fixture.id] === undefined) {
    throw new Error('Fixtures data has not loaded yet - reload the page and try again.');
  }
  const rowNumber = rowIndexCache[fixture.id];
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
      range: `${sheetName}!${letter}${rowNumber}:${letter}${rowNumber}`,
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

  // Missing headers never throw here - everything else in this save did
  // write successfully, and the caller (which knows which of these fields
  // it actually just tried to change) decides whether to surface a visible
  // warning instead of leaving it a silent, invisible failure.
  return { ...fixture, updatedAt, missingFields: missing };
}

// Adds a brand-new fixture row (a matchday, or a cup tie, added one at a
// time from the app instead of the whole-season paste-into-the-sheet setup).
// Takes a plain fields object now rather than a fixed Serie-A-shaped
// signature, since this same tab (and this same append) now also creates cup
// fixture rows (competition/round/neutralVenue instead of matchday/day) -
// the caller (useFixtures.js for Serie A, useCupFixtures.js for cups)
// supplies whichever shape is its own. id is computed from a fresh read
// right before appending so two near-simultaneous creates don't collide,
// matching the same append pattern as sheetTab.js.
export async function appendFixtureRow(fields, accessToken, sheetName) {
  const current = await fetchFixtures(sheetName);
  const headerIndex = headerIndexCache;
  const nextId = current.reduce((max, f) => Math.max(max, Number(f.id) || 0), 0) + 1;

  // Stamped here rather than left to the caller, so every newly-created row
  // (Serie A or cup - both go through this same append) gets a real
  // `updatedAt` immediately instead of sitting blank until its first edit,
  // and `day` is always in sync with `date` from the moment the row exists,
  // not just after someone happens to touch it.
  const day = fields.date ? computeDayOfWeek(fields.date) : (fields.day ?? '');
  const allFields = { id: nextId, ...fields, day, updatedAt: new Date().toISOString() };

  const maxIdx = Math.max(...Object.values(headerIndex));
  const row = new Array(maxIdx + 1).fill('');
  const missing = [];
  for (const [key, value] of Object.entries(allFields)) {
    const idx = headerIndex[key];
    if (idx === undefined) {
      missing.push(key);
      continue;
    }
    row[idx] = value ?? '';
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    `${sheetName}!A1`
  )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range: `${sheetName}!A1`, majorDimension: 'ROWS', values: [row] }),
  });
  if (res.status === 401 || res.status === 403) throw new Error('UNAUTHENTICATED');
  if (!res.ok) throw new Error('Failed to add the new fixture to Google Sheets');
  if (missing.length > 0) {
    throw new Error(`Added, but the fixtures sheet has no column header for: ${missing.join(', ')}.`);
  }

  // `current` (from the fetchFixtures above) reflects every row before this
  // append, so the new one lands right after all of them - keeps
  // rowIndexCache accurate for this row without waiting on another fetch.
  rowIndexCache[nextId] = current.length + 2;

  return { ...allFields };
}

// Actually removes the sheet row (rather than just clearing its cells) -
// deleteDimension shifts every row below it up by one, which would silently
// break every other cached row number (including the "row N+1 holds fixture
// id N" shortcut this file used to rely on) if left unaddressed. Refetches
// right after so rowIndexCache is rebuilt from the sheet's real, post-delete
// layout, and hands back the fresh fixture list so the caller doesn't need
// to patch its own state blind to which rows just shifted.
export async function deleteFixtureRow(id, accessToken, sheetName) {
  if (!rowIndexCache || rowIndexCache[id] === undefined) {
    throw new Error('Fixtures data has not loaded yet - reload the page and try again.');
  }
  const rowNumber = rowIndexCache[id];
  const sheetId = await getSheetId(sheetName, accessToken);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        { deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } } },
      ],
    }),
  });
  if (res.status === 401 || res.status === 403) throw new Error('UNAUTHENTICATED');
  if (!res.ok) throw new Error('Failed to delete fixture from Google Sheets');
  return fetchFixtures(sheetName);
}

// isBigMatch/isDerby also get written opportunistically whenever a fixture is
// otherwise edited (see EDITABLE_FIELDS above), but that only reaches rows
// someone happens to touch. This does every currently-loaded fixture in one
// go, so the sheet is a complete, queryable mirror of what Settings computes
// right after configuring bigClub/derbyRival, not just the rows someone
// happened to edit.
export async function syncMatchTags(fixtures, accessToken, sheetName) {
  const headerIndex = await fetchHeaderIndexFor(sheetName);
  const bigIdx = headerIndex.isBigMatch;
  const derbyIdx = headerIndex.isDerby;
  if (bigIdx === undefined && derbyIdx === undefined) {
    throw new Error(`The "${sheetName}" tab is missing isBigMatch/isDerby column headers - see README.`);
  }

  const data = [];
  for (const fixture of fixtures) {
    const rowNumber = Number(fixture.id) + 1;
    const { isBigMatch, isDerby } = computeMatchTags(fixture);
    if (bigIdx !== undefined) {
      const letter = columnIndexToLetter(bigIdx);
      data.push({ range: `${sheetName}!${letter}${rowNumber}:${letter}${rowNumber}`, majorDimension: 'ROWS', values: [[isBigMatch]] });
    }
    if (derbyIdx !== undefined) {
      const letter = columnIndexToLetter(derbyIdx);
      data.push({ range: `${sheetName}!${letter}${rowNumber}:${letter}${rowNumber}`, majorDimension: 'ROWS', values: [[isDerby]] });
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
