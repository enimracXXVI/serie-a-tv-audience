import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
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
  { key: 'skyCount', label: 'On Sky', title: 'Games also broadcast on Sky' },
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

  function headerClick(key, event) {
    if (key === 'team') return;
    setSortChain((prev) => {
      if (!event.shiftKey) {
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
    <div className="overflow-x-auto rounded-2xl bg-white shadow-lg shadow-black/20">
      <div className="px-3 pt-2 text-[10px] text-gray-400">Shift+click a column to sort by multiple columns</div>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            {COLUMNS.map((col) => {
              const chainIdx = sortChain.findIndex((s) => s.key === col.key);
              return (
                <th
                  key={col.key}
                  title={col.title}
                  onClick={(e) => headerClick(col.key, e)}
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
              className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                row.team.slug === focusedSlug ? 'bg-[#1fd8c9]/10' : row.team.sponsored ? 'bg-[#1fd8c9]/5' : ''
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
    </div>
  );
}
