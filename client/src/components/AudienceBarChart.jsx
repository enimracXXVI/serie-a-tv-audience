import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
import Card from './Card.jsx';
import Dropdown from './Dropdown.jsx';
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
  if (key === 'homeAddedTimeAvg') return `${Math.round(value)} min`;
  return formatNumber(value);
}

export default function AudienceBarChart({ metrics, focusedSlug, onFocus }) {
  const [metricKey, setMetricKey] = useState('homeAudienceTotal');

  const ranked = useMemo(() => [...metrics].sort((a, b) => b[metricKey] - a[metricKey]), [metrics, metricKey]);
  const max = Math.max(...ranked.map((r) => r[metricKey]), 1);

  return (
    <Card
      title="Clubs ranked by"
      controls={
        <Dropdown
          variant="header"
          value={metricKey}
          onChange={setMetricKey}
          options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
        />
      }
    >
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
    </Card>
  );
}
