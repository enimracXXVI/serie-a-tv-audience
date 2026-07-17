import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
import { formatNumber } from '../lib/formatNumber.js';

const METRICS = [
  { key: 'homeAudienceAvg', label: 'Home audience (avg/game)' },
  { key: 'homeAudienceTotal', label: 'Home audience (season total)' },
  { key: 'awayAudienceAvg', label: 'Away audience (avg/game) - visitor draw power' },
  { key: 'totalAudienceAvg', label: 'Total audience (avg/game)' },
  { key: 'totalAudienceTotal', label: 'Total audience (season total)' },
  { key: 'homeAddedTimeAvg', label: 'Added time (avg min/home game)' },
];

function formatValue(key, value) {
  if (key === 'homeAddedTimeAvg') return `${value.toFixed(1)} min`;
  return formatNumber(value);
}

export default function AudienceBarChart({ metrics, focusedSlug, onFocus }) {
  const [metricKey, setMetricKey] = useState('homeAudienceAvg');

  const ranked = useMemo(() => [...metrics].sort((a, b) => b[metricKey] - a[metricKey]), [metrics, metricKey]);
  const max = Math.max(...ranked.map((r) => r[metricKey]), 1);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#0f1e54]">Clubs ranked by</h3>
        <select
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value)}
          className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-[#0f1e54] outline-none focus:border-[#1fd8c9]"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        {ranked.map((row) => {
          const team = row.team;
          const value = row[metricKey];
          const widthPct = max > 0 ? (value / max) * 100 : 0;
          const isFocused = team.slug === focusedSlug;
          const isDim = focusedSlug && !isFocused;
          return (
            <button
              key={team.slug}
              onClick={() => onFocus(isFocused ? null : team.slug)}
              className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-opacity ${
                isDim ? 'opacity-35' : 'opacity-100'
              } hover:bg-gray-50`}
            >
              <Crest team={team} size={18} />
              <span
                className={`w-24 shrink-0 truncate text-xs ${
                  team.sponsored ? 'font-bold text-[#0f1e54]' : 'text-gray-600'
                }`}
              >
                {team.name}
              </span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${widthPct}%`, background: team.primary || '#94a3b8' }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-bold text-[#0f1e54]">
                {formatValue(metricKey, value)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
