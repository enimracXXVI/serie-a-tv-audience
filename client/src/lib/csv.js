// Shared by exportCsv.js (fixtures) and hospitalityGuests-related exports -
// the actual "turn rows into a CSV file and hand it to the browser" part
// never differs between them, only which columns/rows get fed in.

export function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// Excel (and, less aggressively, Google Sheets) auto-detects a bare
// "18:30" or "2026-08-24"-shaped CSV field as a date/time on import and
// converts it to its own internal serial number - a plain "HH:MM" time in
// particular is prone to landing in "General" format afterwards, which
// then displays as a raw decimal fraction instead of a readable time.
// Wrapping the value in ="..." is the standard workaround: Excel (and
// Sheets) evaluate it as a formula that resolves right back to the quoted
// text, so it imports as literal text instead of getting reinterpreted.
// Use this for any column holding a bare date/time/kickoff-shaped string,
// not for every column - forcing e.g. a score column through this would
// stop it importing as a number.
export function csvText(value) {
  if (value === null || value === undefined || value === '') return '';
  return `="${String(value).replace(/"/g, '""')}"`;
}

export function toCSV(columns, rows) {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(','));
  return [header, ...lines].join('\r\n');
}

export function downloadCSV(csv, filename) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
