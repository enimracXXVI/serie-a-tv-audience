import { SPREADSHEET_ID, GOOGLE_API_KEY } from './config.js';
import { columnIndexToLetter, buildHeaderIndex, cell, getSheetId } from './sheetsCommon.js';

// A reusable Google Sheets tab client (fetch all rows by header name, update
// a row by id, append a new row) - the same shape as the hand-written
// fixtures client in sheets.js, generalized so a new tab (teams, broadcasters,
// cupFixtures) doesn't need its own copy of the fetch/update/append
// boilerplate.
//
// idField identifies each row - autoIncrementId assigns the next integer
// (like the fixtures tab's numeric id); set it false for a tab where the
// user supplies their own key (teams' slug, broadcasters' name) - appendRow
// then requires that field and rejects a duplicate.
export function createSheetTabClient({
  sheetName,
  idField = 'id',
  autoIncrementId = true,
  numericFields = [],
  booleanFields = [],
  imageFormulaFields = [],
  // A field whose value can look like a date/number (an ISO date, a plain
  // decimal) needs to go in as a formula, not a literal - valueInputOption
  // RAW is documented to store a value "as-is", but empirically Sheets
  // still re-interprets a RAW-submitted date/time-shaped STRING back into
  // a numeric serial (confirmed directly against this spreadsheet: a
  // freshly-written "2026-11-16" came back with userEnteredValue.numberValue
  // set, i.e. Sheets itself decided it was a number, not RAW honoring the
  // literal string). A quoted formula's result type is unambiguous - Sheets
  // can't reinterpret the STRING RESULT of `="2026-11-16"` as a date the
  // way it reinterprets a literal value - so a field listed here is always
  // written as that formula via USER_ENTERED instead, the same trick
  // already used for imageFormulaFields.
  textFormulaFields = [],
  // A tab keyed by a natural key (slug, label, ...) can still carry its own
  // separate bookkeeping "id" column for the user's own reference (see
  // README) - set this to that column's name (almost always 'id') to have a
  // fresh `ID00001`-style value auto-filled on every new row, the same way
  // the real idField already gets one. Left null (the default) for a tab
  // where idField already IS the bookkeeping column (e.g. fixtures).
  bookkeepingIdField = null,
}) {
  const NUMERIC_FIELDS = new Set(numericFields);
  const BOOLEAN_FIELDS = new Set(booleanFields);
  const IMAGE_FORMULA_FIELDS = new Set(imageFormulaFields);
  const TEXT_FORMULA_FIELDS = new Set(textFormulaFields);
  // Unbounded column width - a fixed column-letter cap silently truncates
  // the header read once a tab grows past that column (see fetchFixtures in
  // sheets.js, which hit exactly this with a 34+ column fixtures tab).
  const FULL_RANGE = `${sheetName}!1:500`;

  let headerIndexCache = null;
  let rowIndexCache = null; // id -> row number (row N+1 holds the (N)th data row, exactly like fixtures/teams)

  // Manually-typed data can hold "true"/"True"/" TRUE " instead of a real
  // checkbox or an exact-cased "TRUE" string - match leniently rather than
  // silently treating anything but an exact match as false (same tolerance
  // sheets.js/seasonFixtures.js already apply to isBigMatch and friends).
  function isTruthyCell(value) {
    return value === true || (typeof value === 'string' && value.trim().toUpperCase() === 'TRUE');
  }

  // UNFORMATTED_VALUE can't compute an =IMAGE("url") formula down to a plain
  // value (it just comes back blank), so a field configured as
  // imageFormulaFields needs a second, FORMULA-rendered read to recover the
  // URL. A plain pasted URL passes through unchanged either way, so this
  // stays backward compatible with just typing a link straight into the cell.
  function extractImageUrl(raw) {
    if (typeof raw !== 'string') return raw ?? null;
    const trimmed = raw.trim();
    const match = trimmed.match(/^=image\(\s*"([^"]*)"/i);
    if (match) return match[1] || null;
    return trimmed || null;
  }

  // The formula result is the literal text between the quotes, exactly as
  // UNFORMATTED_VALUE would hand back a plain string cell - no second
  // FORMULA-mode read needed on read-back, unlike imageFormulaFields.
  function textFormula(value) {
    return `="${String(value).replace(/"/g, '""')}"`;
  }

  function rowToItem(row, headerIndex) {
    const obj = {};
    for (const [key, idx] of Object.entries(headerIndex)) {
      let value = cell(row, idx);
      if (BOOLEAN_FIELDS.has(key)) value = isTruthyCell(value);
      else if (NUMERIC_FIELDS.has(key) && value !== null) value = Number(value);
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

    // Each configured image-formula field needs its own second read (in
    // FORMULA render mode) to unwrap =IMAGE("url") - fetched once per field
    // here, keyed by data-row position, then merged into each item below.
    const imageFormulas = {};
    for (const field of IMAGE_FORMULA_FIELDS) {
      if (headerIndex[field] === undefined || dataRows.length === 0) continue;
      const letter = columnIndexToLetter(headerIndex[field]);
      const range = `${sheetName}!${letter}2:${letter}${dataRows.length + 1}`;
      try {
        const formulaRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
            range
          )}?key=${GOOGLE_API_KEY}&valueRenderOption=FORMULA&_=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (formulaRes.ok) {
          const formulaData = await formulaRes.json();
          imageFormulas[field] = (formulaData.values || []).map((r) => cell(r, 0));
        }
      } catch {
        // non-fatal - falls back to the plain UNFORMATTED_VALUE reading below
      }
    }

    const rowIndex = {};
    const items = [];
    dataRows.forEach((row, i) => {
      if (row.length === 0) return;
      const obj = rowToItem(row, headerIndex);
      for (const field of IMAGE_FORMULA_FIELDS) {
        if (imageFormulas[field]) obj[field] = extractImageUrl(imageFormulas[field][i]) ?? obj[field];
      }
      if (obj[idField] === null || obj[idField] === undefined || obj[idField] === '') return;
      items.push(obj);
      rowIndex[obj[idField]] = i + 2; // header occupies row 1
    });
    rowIndexCache = rowIndex;
    return items;
  }

  async function postBatchUpdate(valueInputOption, data, accessToken) {
    if (data.length === 0) return;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption, data }),
    });
    if (res.status === 401 || res.status === 403) throw new Error('UNAUTHENTICATED');
    if (!res.ok) throw new Error(`Failed to save to the "${sheetName}" tab`);
  }

  // Splits fields into plain RAW writes and =IMAGE("url") USER_ENTERED
  // writes - Sheets' batchUpdate takes one valueInputOption per call, so an
  // image-formula field always needs its own separate post from everything
  // else.
  function buildWriteBatches(rowNumber, fields) {
    const rawData = [];
    const formulaData = [];
    const missing = [];
    for (const field of Object.keys(fields)) {
      const colIdx = headerIndexCache[field];
      if (colIdx === undefined) {
        missing.push(field);
        continue;
      }
      const letter = columnIndexToLetter(colIdx);
      const range = `${sheetName}!${letter}${rowNumber}:${letter}${rowNumber}`;
      if (IMAGE_FORMULA_FIELDS.has(field)) {
        const url = fields[field];
        const value = url ? `=IMAGE("${String(url).replace(/"/g, '""')}")` : '';
        formulaData.push({ range, majorDimension: 'ROWS', values: [[value]] });
      } else if (TEXT_FORMULA_FIELDS.has(field) && fields[field]) {
        formulaData.push({ range, majorDimension: 'ROWS', values: [[textFormula(fields[field])]] });
      } else {
        rawData.push({ range, majorDimension: 'ROWS', values: [[fields[field] ?? '']] });
      }
    }
    return { rawData, formulaData, missing };
  }

  async function updateRow(id, fields, accessToken) {
    if (!headerIndexCache || rowIndexCache?.[id] === undefined) {
      throw new Error(`"${sheetName}" data has not loaded yet - reload the page and try again.`);
    }
    const rowNumber = rowIndexCache[id];
    const { rawData, formulaData, missing } = buildWriteBatches(rowNumber, fields);
    if (rawData.length === 0 && formulaData.length === 0) {
      throw new Error(`No matching column headers found in the "${sheetName}" tab - check row 1 has the expected labels.`);
    }
    await postBatchUpdate('RAW', rawData, accessToken);
    await postBatchUpdate('USER_ENTERED', formulaData, accessToken);
    // Missing headers never throw here - everything else in this save did
    // write successfully; the caller decides whether to surface a warning
    // scoped to just the field(s) it actually tried to change.
    return { missingFields: missing };
  }

  // Same job as updateRow, but for many rows in ONE Sheets request instead
  // of one HTTP request per row. A loop calling updateRow per-row (even
  // spaced out) blows through Sheets' per-minute write quota well before a
  // few hundred rows finish, failing the back half with no obvious cause -
  // batchUpdate already accepts any number of ranges in a single call, so a
  // bulk repair pass should use that instead of reinventing pacing/retries
  // around a request-per-row design that can't actually scale.
  async function updateRows(updates, accessToken) {
    if (!headerIndexCache) {
      throw new Error(`"${sheetName}" data has not loaded yet - reload the page and try again.`);
    }
    const rawData = [];
    const formulaData = [];
    const results = [];
    for (const { id, fields } of updates) {
      const rowNumber = rowIndexCache?.[id];
      if (rowNumber === undefined) {
        results.push({ id, missingFields: Object.keys(fields) });
        continue;
      }
      const { rawData: rowRaw, formulaData: rowFormula, missing } = buildWriteBatches(rowNumber, fields);
      rawData.push(...rowRaw);
      formulaData.push(...rowFormula);
      results.push({ id, missingFields: missing });
    }
    await postBatchUpdate('RAW', rawData, accessToken);
    await postBatchUpdate('USER_ENTERED', formulaData, accessToken);
    return { results };
  }

  // A column can carry an inherited Date/Time number format (from however
  // its very first rows were created) that keeps re-coercing any later RAW
  // write of a clean "YYYY-MM-DD"/"HH:MM" string right back into a numeric
  // serial, no matter how many times it's rewritten - valueInputOption=RAW
  // stops Sheets parsing a value as a formula or locale-specific number, but
  // does NOT stop an already-date/time-formatted cell reinterpreting a
  // date/time-shaped string the same way typing it into that cell by hand
  // would. The fix has to be structural (the column's own format), not
  // another value write - this sets it to Plain text once, after which a
  // RAW string actually sticks as text. Idempotent: safe to call every time,
  // covers the whole column from row 2 to the end of the sheet (so it also
  // protects rows added after this runs, not just existing ones).
  async function forceTextColumns(fields, accessToken) {
    if (!headerIndexCache) {
      throw new Error(`"${sheetName}" data has not loaded yet - reload the page and try again.`);
    }
    const sheetId = await getSheetId(sheetName, accessToken);
    const requests = fields
      .filter((field) => headerIndexCache[field] !== undefined)
      .map((field) => ({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 1,
            startColumnIndex: headerIndexCache[field],
            endColumnIndex: headerIndexCache[field] + 1,
          },
          cell: { userEnteredFormat: { numberFormat: { type: 'TEXT' } } },
          fields: 'userEnteredFormat.numberFormat',
        },
      }));
    if (requests.length === 0) return;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
    if (res.status === 401 || res.status === 403) throw new Error('UNAUTHENTICATED');
    if (!res.ok) throw new Error(`Failed to set column formatting on the "${sheetName}" tab`);
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

    if (
      bookkeepingIdField &&
      bookkeepingIdField !== idField &&
      headerIndexCache[bookkeepingIdField] !== undefined &&
      !allFields[bookkeepingIdField]
    ) {
      // The cell itself just holds a plain number - the "ID00001" look is a
      // custom number format applied to the column, not literal text (same
      // convention as the fixtures tab's own numeric id). Writing a real
      // number here lets that format render it; writing the string "ID00001"
      // would defeat the format entirely and, since read-back would then
      // never match a plain number either, reset every new row back to 1.
      const nextBookkeepingId = current.reduce((max, r) => Math.max(max, Number(r[bookkeepingIdField]) || 0), 0) + 1;
      allFields = { ...allFields, [bookkeepingIdField]: nextBookkeepingId };
    }

    const maxIdx = Math.max(...Object.values(headerIndexCache));
    const row = new Array(maxIdx + 1).fill('');
    const missing = [];
    // A text-formula field is left blank in this row and written in a
    // separate, surgical follow-up call below instead of inline here -
    // append only supports one valueInputOption for the WHOLE row, and
    // switching that to USER_ENTERED for every field (rather than just
    // image-formula ones, as before) would let a leading "=" in any other
    // field - a name, a handle, an email - get evaluated as a real formula
    // instead of staying literal text.
    const textFormulaFollowUps = {};
    for (const [key, value] of Object.entries(allFields)) {
      const idx = headerIndexCache[key];
      if (idx === undefined) {
        missing.push(key);
        continue;
      }
      if (IMAGE_FORMULA_FIELDS.has(key)) {
        row[idx] = value ? `=IMAGE("${String(value).replace(/"/g, '""')}")` : '';
      } else if (TEXT_FORMULA_FIELDS.has(key) && value) {
        textFormulaFollowUps[key] = value;
      } else {
        row[idx] = value ?? '';
      }
    }

    // Any image-formula field needs USER_ENTERED to be parsed as a formula
    // rather than shown as literal text - append itself only supports one
    // valueInputOption, so use USER_ENTERED whenever such a field is
    // configured (a plain string in any other cell passes through unchanged).
    const valueInputOption = imageFormulaFields.length > 0 ? 'USER_ENTERED' : 'RAW';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      `${sheetName}!A1`
    )}:append?valueInputOption=${valueInputOption}&insertDataOption=INSERT_ROWS`;
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

    // `current` (from the fetchAll above) reflects every row before this
    // append, so the new one lands right after all of them - without this,
    // rowIndexCache wouldn't know this row's number until the next fetchAll,
    // and editing another field on it in the same session (before a reload)
    // would fail with "data has not loaded yet" even though it just saved.
    const newRowNumber = current.length + 2;
    rowIndexCache[allFields[idField]] = newRowNumber;

    if (Object.keys(textFormulaFollowUps).length > 0) {
      const { formulaData } = buildWriteBatches(newRowNumber, textFormulaFollowUps);
      await postBatchUpdate('USER_ENTERED', formulaData, accessToken);
    }

    return { id: allFields[idField], item: allFields };
  }

  // Actually removes the sheet row (rather than just clearing its cells) -
  // deleteDimension shifts every row below it up by one, which would
  // silently invalidate every other cached row number if left alone. Rather
  // than accept that risk, this refetches the whole tab right after so
  // rowIndexCache (and whatever the caller displays) is rebuilt from the
  // sheet's real, post-delete layout - the cost is one extra read per
  // delete, in exchange for never leaving a blank row behind.
  async function deleteRow(id, accessToken) {
    if (!headerIndexCache || rowIndexCache?.[id] === undefined) {
      throw new Error(`"${sheetName}" data has not loaded yet - reload the page and try again.`);
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
    if (!res.ok) throw new Error(`Failed to delete from the "${sheetName}" tab`);
    return fetchAll();
  }

  return { fetchAll, updateRow, updateRows, forceTextColumns, appendRow, deleteRow };
}
