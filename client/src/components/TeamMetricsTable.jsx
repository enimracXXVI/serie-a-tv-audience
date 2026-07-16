import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';

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
      return `${(Math.round(row[key] * 100) / 100).toString()}M`;
    case 'homeAddedTimeAvg':
      return `${row[key].toFixed(1)}'`;
    default:
      return row[key];
  }
}

export default function TeamMetricsTable({ metrics, focusedSlug, onFocus }) {
  const [sortKey, setSortKey] = useState('homeAudienceAvg');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    const list = [...metrics];
    list.sort((a, b) => {
      if (sortKey === 'team') return a.team.name.localeCompare(b.team.name) * (sortDir === 'asc' ? 1 : -1);
      return (a[sortKey] - b[sortKey]) * (sortDir === 'asc' ? 1 : -1);
    });
    return list;
  }, [metrics, sortKey, sortDir]);

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-lg shadow-black/20">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                title={col.title}
                onClick={() => col.sortable !== false && toggleSort(col.key)}
                className={`px-3 py-2.5 text-center first:text-left ${
                  col.sortable === false ? '' : 'cursor-pointer select-none hover:text-[#0f1e54]'
                }`}
              >
                {col.label}
                {sortKey === col.key && <span className="ml-0.5">{sortDir === 'asc' ? '▲' : '▼'}</span>}
              </th>
            ))}
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
