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
//
// The trick only works if ="..." lands in the file UNQUOTED at the CSV
// level - a field that's itself wrapped in an outer pair of CSV quotes
// (which csvEscape would do here, since ="..." contains literal " chars)
// gets read by some importers, Google Sheets in particular, as "this is
// just quoted text", skipping formula evaluation entirely and leaving the
// date/time to fall straight back into the 5-digit-serial-number/0.xxxx-
// decimal auto-reformatting this was meant to prevent. So this returns a
// marker object instead of a plain string - toCSV below recognizes it and
// writes the ="..." text out raw, bypassing csvEscape rather than running
// it through a second (self-defeating) layer of quoting.
//
// Use this for any column holding a bare date/time/kickoff-shaped string,
// not for every column - forcing e.g. a score column through this would
// stop it importing as a number.
export function csvText(value) {
  if (value === null || value === undefined || value === '') return '';
  return { __csvRaw: `="${String(value).replace(/"/g, '""')}"` };
}

function csvField(value) {
  if (value && typeof value === 'object' && '__csvRaw' in value) return value.__csvRaw;
  return csvEscape(value);
}

export function toCSV(columns, rows) {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvField(row[c.key])).join(','));
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
