// Converts a plain "YYYY-MM-DD" string (the shape <input type="date"> and
// the sheet both store internally) to "DD/MM/YYYY" - every day-first
// website this data ever gets copy-pasted into (see HospitalityPage/
// exportHospitalityCsv) expects that order, not ISO's year-first one.
export function isoToDDMMYYYY(isoDate) {
  if (!isoDate) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

// Today's own date as the same "YYYY-MM-DD" shape fixtures store - in the
// viewer's LOCAL calendar day, not UTC, so "today" matches what the clock
// on the wall actually says regardless of time zone.
export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

// Typing a date/time straight into a Sheets cell (rather than through this
// app, which always writes plain "YYYY-MM-DD"/"HH:MM" text) makes Sheets
// store it as a real Date/Time value internally - a serial number, read
// back raw as a bare number via the Sheets API's UNFORMATTED_VALUE mode
// (see sheets.js/seasonFixtures.js's own rowToFixture) instead of the text
// every date/time field here otherwise holds. These convert that serial
// back to the shape the app expects, so a hand-edited cell self-heals
// instead of leaking a raw 5-digit number (or a 0.xxxx decimal, for a time)
// into the UI, a CSV export, or anywhere else that copies the value in at
// some point and keeps it from then on (see HospitalityPage's guest rows).
export function excelSerialToISODate(serial) {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86400000).toISOString().slice(0, 10);
}

export function excelSerialToTime(serial) {
  const totalMinutes = Math.round(serial * 24 * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
