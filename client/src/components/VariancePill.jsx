import { formatNumber } from '../lib/formatNumber.js';

// Shared by every season-on-season/year-on-year comparison (Dashboard's YoY
// table and season comparison card) - green/red only mean something once
// there's an actual prior figure to compare against, so a missing side
// renders a plain dash rather than a misleading 0% or a false "increase"
// against nothing.
export default function VariancePill({ delta, deltaPct, compact = false }) {
  if (delta === null || delta === undefined || deltaPct === null || deltaPct === undefined) {
    return <span className="text-gray-300">—</span>;
  }
  if (delta === 0) {
    return <span className="font-semibold text-gray-500">No change</span>;
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-bold ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      } ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}
    >
      {up ? '▲' : '▼'} {formatNumber(Math.abs(delta))} ({up ? '+' : '-'}
      {Math.abs(deltaPct).toFixed(1)}%)
    </span>
  );
}
