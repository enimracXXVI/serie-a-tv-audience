// One formatter for every audience figure on the dashboard - no assumed
// unit (a hardcoded "M" suffix is wrong if the sheet's numbers aren't
// pre-divided into millions), just a plain, readable number with thousands
// separators and at most 2 decimal places.
export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}
