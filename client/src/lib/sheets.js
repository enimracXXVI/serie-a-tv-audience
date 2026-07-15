import { SPREADSHEET_ID, SHEET_NAME, GOOGLE_API_KEY } from './config.js';

// Columns A-P in the sheet, in order.
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
  'onSky',
  'addedTime1H',
  'addedTime2H',
  'daznSimulcastAudience',
];
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
const BOOLEAN_FIELDS = new Set(['onSky']);

// Rows 2-381 hold the 380 seeded fixtures; row 1 is the header.
const DATA_RANGE = `${SHEET_NAME}!A2:P381`;

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
    } else if (BOOLEAN_FIELDS.has(key)) {
      value = value === true || value === 'TRUE';
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
  return (data.values || []).map(rowToFixture);
}

export async function updateFixtureRow(fixture, accessToken) {
  const rowNumber = Number(fixture.id) + 1; // header occupies row 1
  const updatedAt = new Date().toISOString();

  const data = [
    {
      range: `${SHEET_NAME}!D${rowNumber}:D${rowNumber}`,
      majorDimension: 'ROWS',
      values: [[fixture.date ?? '']],
    },
    {
      range: `${SHEET_NAME}!G${rowNumber}:P${rowNumber}`,
      majorDimension: 'ROWS',
      values: [
        [
          fixture.homeScore ?? '',
          fixture.awayScore ?? '',
          fixture.daznAudience ?? '',
          fixture.skyAudience ?? '',
          fixture.kickoffTime ?? '',
          updatedAt,
          Boolean(fixture.onSky),
          fixture.addedTime1H ?? '',
          fixture.addedTime2H ?? '',
          fixture.daznSimulcastAudience ?? '',
        ],
      ],
    },
  ];

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

  return { ...fixture, updatedAt };
}
