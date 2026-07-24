import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
import Card from './Card.jsx';
import { formatNumber } from '../lib/formatNumber.js';

const COLUMNS = [
  { key: 'team', label: 'Club', sortable: false },
  { key: 'homeAudienceAvg', label: 'Home avg', title: 'Average audience per home game (LED-only evaluation)' },
  { key: 'homeAudienceTotal', label: 'Home total', title: 'Season total audience across home games' },
  { key: 'awayAudienceAvg', label: 'Away avg', title: 'Average audience per away game - this club\'s draw power as a visitor' },
  { key: 'totalAudienceAvg', label: 'Total avg', title: 'Average audience per game, home + away (jersey evaluation)' },
  { key: 'totalAudienceTotal', label: 'Total', title: 'Season total audience, home + away' },
  { key: 'homeAddedTimeAvg', label: 'Added time', title: 'Average stoppage-time minutes per home game' },
  { key: 'simulcastCount', label: 'Simulcast', title: 'Games sharing a DAZN simulcast slot' },
  { key: 'otherBroadcasterCount', label: 'Other', title: 'Games also broadcast elsewhere' },
];

function formatCell(key, row) {
  switch (key) {
    case 'homeAudienceAvg':
    case 'homeAudienceTotal':
    case 'awayAudienceAvg':
    case 'totalAudienceAvg':
    case 'totalAudienceTotal':
      return formatNumber(row[key]);
    case 'homeAddedTimeAvg':
      return `${Math.round(row[key])}'`;
    default:
      return row[key];
  }
}

export default function TeamMetricsTable({ metrics, focusedSlug, onFocus }) {
  const [sortChain, setSortChain] = useState([{ key: 'homeAudienceAvg', dir: 'desc' }]);
  const [multiSort, setMultiSort] = useState(false);

  // Shift+click has no touch equivalent, so multi-column sorting is now a
  // sticky mode toggled by its own button (see the "Multi-sort" pill below)
  // rather than a modifier key - the same click behavior works on mouse and
  // touch alike this way, and there's no longer a hint text to explain a
  // gesture that only worked for half of this app's users.
  function headerClick(key) {
    if (key === 'team') return;
    setSortChain((prev) => {
      if (!multiSort) {
        if (prev.length === 1 && prev[0].key === key) {
          return [{ key, dir: prev[0].dir === 'asc' ? 'desc' : 'asc' }];
        }
        return [{ key, dir: 'desc' }];
      }
      const idx = prev.findIndex((s) => s.key === key);
      if (idx === -1) return [...prev, { key, dir: 'desc' }];
      const next = [...prev];
      next[idx] = { key, dir: next[idx].dir === 'asc' ? 'desc' : 'asc' };
      return next;
    });
  }

  const sorted = useMemo(() => {
    const list = [...metrics];
    list.sort((a, b) => {
      for (const { key, dir } of sortChain) {
        const mul = dir === 'asc' ? 1 : -1;
        const cmp = key === 'team' ? a.team.name.localeCompare(b.team.name) : a[key] - b[key];
        if (cmp !== 0) return cmp * mul;
      }
      return 0;
    });
    return list;
  }, [metrics, sortChain]);

  return (
    <Card
      title="Club table"
      bodyClassName="overflow-x-auto"
      controls={
        <button
          type="button"
          onClick={() => setMultiSort((v) => !v)}
          title="When on, tapping a column adds it to the sort instead of replacing it"
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            multiSort ? 'bg-white text-[#0f1e54]' : 'bg-black/10 text-[#0f1e54]/70 hover:bg-black/20'
          }`}
        >
          Multi-sort
        </button>
      }
    >
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            {COLUMNS.map((col) => {
              const chainIdx = sortChain.findIndex((s) => s.key === col.key);
              return (
                <th
                  key={col.key}
                  title={col.title}
                  onClick={() => headerClick(col.key)}
                  className={`px-3 py-2.5 text-center first:text-left ${
                    col.sortable === false ? '' : 'cursor-pointer select-none hover:text-[#0f1e54]'
                  }`}
                >
                  {col.label}
                  {chainIdx !== -1 && (
                    <span className="ml-0.5">
                      {sortChain[chainIdx].dir === 'asc' ? '▲' : '▼'}
                      {sortChain.length > 1 && <sup>{chainIdx + 1}</sup>}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((row) => (
            <tr
              key={row.team.slug}
              onClick={() => onFocus(row.team.slug === focusedSlug ? null : row.team.slug)}
              className={`cursor-pointer border-l-4 transition-colors hover:bg-gray-50 ${
                row.team.slug === focusedSlug
                  ? 'border-[#0f1e54] bg-[#0f1e54]/10'
                  : row.team.sponsored
                    ? 'border-transparent bg-[#1fd8c9]/5'
                    : 'border-transparent'
              }`}
            >
              <td className="px-3 py-2 text-left">
                <div className="flex items-center gap-2">
                  <Crest team={row.team} size={20} />
                  <span className={`truncate font-semibold ${row.team.sponsored ? 'text-[#0f1e54]' : 'text-gray-700'}`}>
                    {row.team.name}
                  </span>
                  {row.team.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
                </div>
              </td>
              {COLUMNS.slice(1).map((col) => (
                <td key={col.key} className="px-2 py-2 text-center text-gray-600">
                  {formatCell(col.key, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
