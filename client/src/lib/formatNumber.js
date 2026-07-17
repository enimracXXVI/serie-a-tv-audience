// One formatter for every audience figure on the dashboard - no assumed
// unit (a hardcoded "M" suffix is wrong if the sheet's numbers aren't
// pre-divided into millions), just a plain, readable whole number with
// thousands separators - viewer counts don't need fractional precision.
export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

// A compact form for tight spaces (chart axes, heatmap cells) where a full
// 7-digit number won't fit - exact values are always one hover/tap away.
export function formatAbbreviated(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return Math.round(value).toString();
}
