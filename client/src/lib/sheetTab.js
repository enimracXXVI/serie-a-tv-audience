import { SPREADSHEET_ID, GOOGLE_API_KEY } from './config.js';
import { columnIndexToLetter, buildHeaderIndex, cell } from './sheetsCommon.js';

// A reusable Google Sheets tab client (fetch all rows by header name, update
// a row by id, append a new row) - the same shape as the hand-written
// fixtures/teams clients in sheets.js/teamSettings.js, generalized so a new
// tab (cupTeams, broadcasters, cupFixtures) doesn't need its own copy of the
// fetch/update/append boilerplate.
//
// idField identifies each row - autoIncrementId assigns the next integer
// (like the fixtures tab's numeric id); set it false for a tab where the
// user supplies their own key (cupTeams' slug, broadcasters' name) - appendRow
// then requires that field and rejects a duplicate.
export function createSheetTabClient({ sheetName, idField = 'id', autoIncrementId = true, numericFields = [] }) {
  const NUMERIC_FIELDS = new Set(numericFields);
  const FULL_RANGE = `${sheetName}!A1:Z500`;

  let headerIndexCache = null;
  let rowIndexCache = null; // id -> row number (row N+1 holds the (N)th data row, exactly like fixtures/teams)

  function rowToItem(row, headerIndex) {
    const obj = {};
    for (const [key, idx] of Object.entries(headerIndex)) {
      let value = cell(row, idx);
      if (NUMERIC_FIELDS.has(key) && value !== null) value = Number(value);
      obj[key] = value;
    }
    return obj;
  }

  async function fetchAll() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      FULL_RANGE
    )}?key=${GOOGLE_API_KEY}&valueRenderOption=UNFORMATTED_VALUE&_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(
        `Failed to load the "${sheetName}" tab (${res.status}) - make sure it exists with the expected header row (see README).`
      );
    }
    const data = await res.json();
    const rows = data.values || [];
    const [headerRow, ...dataRows] = rows;
    const headerIndex = buildHeaderIndex(headerRow || []);
    if (headerIndex[idField] === undefined) {
      throw new Error(`The "${sheetName}" tab is missing a "${idField}" column header - see README.`);
    }
    headerIndexCache = headerIndex;

    const rowIndex = {};
    const items = [];
    dataRows.forEach((row, i) => {
      if (row.length === 0) return;
      const obj = rowToItem(row, headerIndex);
      if (obj[idField] === null || obj[idField] === undefined || obj[idField] === '') return;
      items.push(obj);
      rowIndex[obj[idField]] = i + 2; // header occupies row 1
    });
    rowIndexCache = rowIndex;
    return items;
  }

  async function postBatchUpdate(data, accessToken) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'RAW', data }),
    });
    if (res.status === 401 || res.status === 403) throw new Error('UNAUTHENTICATED');
    if (!res.ok) throw new Error(`Failed to save to the "${sheetName}" tab`);
  }

  async function updateRow(id, fields, accessToken) {
    if (!headerIndexCache || rowIndexCache?.[id] === undefined) {
      throw new Error(`"${sheetName}" data has not loaded yet - reload the page and try again.`);
    }
    const rowNumber = rowIndexCache[id];
    const data = [];
    const missing = [];
    for (const field of Object.keys(fields)) {
      const colIdx = headerIndexCache[field];
      if (colIdx === undefined) {
        missing.push(field);
        continue;
      }
      const letter = columnIndexToLetter(colIdx);
      data.push({
        range: `${sheetName}!${letter}${rowNumber}:${letter}${rowNumber}`,
        majorDimension: 'ROWS',
        values: [[fields[field] ?? '']],
      });
    }
    if (data.length === 0) {
      throw new Error(`No matching column headers found in the "${sheetName}" tab - check row 1 has the expected labels.`);
    }
    await postBatchUpdate(data, accessToken);
    // Missing headers never throw here - everything else in this save did
    // write successfully; the caller decides whether to surface a warning
    // scoped to just the field(s) it actually tried to change.
    return { missingFields: missing };
  }

  async function appendRow(fields, accessToken) {
    // A fresh read right before appending, both to get an accurate header
    // index/next id and so two near-simultaneous creates don't reuse the
    // same id.
    const current = await fetchAll();

    let allFields = fields;
    if (autoIncrementId) {
      const nextId = current.reduce((max, r) => Math.max(max, Number(r[idField]) || 0), 0) + 1;
      allFields = { ...fields, [idField]: nextId };
    } else {
      const key = fields[idField];
      if (key === undefined || key === null || key === '') {
        throw new Error(`"${idField}" is required.`);
      }
      if (current.some((r) => r[idField] === key)) {
        throw new Error(`"${key}" already exists in the "${sheetName}" tab - pick a different ${idField}.`);
      }
    }

    const maxIdx = Math.max(...Object.values(headerIndexCache));
    const row = new Array(maxIdx + 1).fill('');
    const missing = [];
    for (const [key, value] of Object.entries(allFields)) {
      const idx = headerIndexCache[key];
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
    if (!res.ok) throw new Error(`Failed to add the new row to the "${sheetName}" tab`);
    if (missing.length > 0) {
      throw new Error(`Added, but the "${sheetName}" tab has no column header for: ${missing.join(', ')}.`);
    }

    return { id: allFields[idField], item: allFields };
  }

  return { fetchAll, updateRow, appendRow };
}
