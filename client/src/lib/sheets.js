import { SPREADSHEET_ID, SHEET_NAME, GOOGLE_API_KEY } from './config.js';

// Columns A-L in the sheet, in order.
const COLUMNS = [
  'id',
  'matchday',
  'day',
  'date',
  'home',
  'away',
  'homeScore',
  'awayScore',
  'daznAudience',
  'skyAudience',
  'kickoffTime',
  'updatedAt',
];
const NUMERIC_FIELDS = new Set(['id', 'matchday', 'homeScore', 'awayScore', 'daznAudience', 'skyAudience']);

// Rows 2-381 hold the 380 seeded fixtures; row 1 is the header.
const DATA_RANGE = `${SHEET_NAME}!A2:L381`;

function excelSerialToISODate(serial) {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86400000).toISOString().slice(0, 10);
}

function cell(row, index) {
  return row[index] === undefined || row[index] === '' ? null : row[index];
}

function rowToFixture(row) {
  const obj = {};
  COLUMNS.forEach((key, i) => {
    let value = cell(row, i);
    if (key === 'date' && typeof value === 'number') {
      value = excelSerialToISODate(value);
    } else if (NUMERIC_FIELDS.has(key) && value !== null) {
      value = Number(value);
    }
    obj[key] = value;
  });
  return obj;
}

export async function fetchFixtures() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    DATA_RANGE
  )}?key=${GOOGLE_API_KEY}&valueRenderOption=UNFORMATTED_VALUE`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load fixtures from Google Sheets');
  const data = await res.json();
  return (data.values || []).map(rowToFixture);
}

export async function updateFixtureRow(fixture, accessToken) {
  const rowNumber = Number(fixture.id) + 1; // header occupies row 1
  const range = `${SHEET_NAME}!G${rowNumber}:L${rowNumber}`;
  const updatedAt = new Date().toISOString();
  const values = [
    [
      fixture.homeScore ?? '',
      fixture.awayScore ?? '',
      fixture.daznAudience ?? '',
      fixture.skyAudience ?? '',
      fixture.kickoffTime ?? '',
      updatedAt,
    ],
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    range
  )}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });

  if (res.status === 401 || res.status === 403) throw new Error('UNAUTHENTICATED');
  if (!res.ok) throw new Error('Failed to save to Google Sheets');

  return { ...fixture, updatedAt };
}
