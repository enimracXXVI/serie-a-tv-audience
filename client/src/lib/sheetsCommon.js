// Shared helpers for talking to Google Sheets ranges by header name instead
// of fixed column letters, used by both the fixtures and team-settings data
// layers.

export function columnIndexToLetter(index) {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

export function buildHeaderIndex(headerRow) {
  const index = {};
  (headerRow || []).forEach((name, i) => {
    if (name) index[String(name).trim()] = i;
  });
  return index;
}

export function cell(row, index) {
  return row[index] === undefined || row[index] === '' ? null : row[index];
}
