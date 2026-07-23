import { useMemo, useState } from 'react';
import { formatNumber } from '../lib/formatNumber.js';
import GameListModal from './GameListModal.jsx';
import Card from './Card.jsx';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LIMITS = [10, 20];

function compareValue(key, a, b) {
  if (key === 'day') return DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
  if (key === 'time') return a.time.localeCompare(b.time);
  return a[key] - b[key];
}

const COLUMNS = [
  { key: 'day', label: 'Day' },
  { key: 'time', label: 'Kickoff' },
  { key: 'avg', label: 'Avg audience' },
  { key: 'total', label: 'Total' },
  { key: 'count', label: 'Games' },
];

export default function DayTimeBreakdownTable({ rows, simulcastInfo }) {
  const [sortChain, setSortChain] = useState([{ key: 'avg', dir: 'desc' }]);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState(null);

  function headerClick(key, event) {
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
    const list = [...rows];
    list.sort((a, b) => {
      for (const { key, dir } of sortChain) {
        const mul = dir === 'asc' ? 1 : -1;
        const cmp = compareValue(key, a, b);
        if (cmp !== 0) return cmp * mul;
      }
      return 0;
    });
    return list;
  }, [rows, sortChain]);

  const visible = limit === null ? sorted : sorted.slice(0, limit);

  return (
    <Card
      title="Day + kickoff time breakdown"
      bodyClassName="overflow-x-auto p-4"
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-white/80">Shift+click a column to sort by multiple columns</span>
          <div className="flex gap-1">
            {LIMITS.map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  limit === n ? 'bg-white text-[#0f1e54]' : 'bg-black/10 text-[#0f1e54]/70 hover:bg-black/20'
                }`}
              >
                Top {n}
              </button>
            ))}
            <button
              onClick={() => setLimit(null)}
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                limit === null ? 'bg-white text-[#0f1e54]' : 'bg-black/10 text-[#0f1e54]/70 hover:bg-black/20'
              }`}
            >
              Show all
            </button>
          </div>
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">No played games with this data yet.</p>
      ) : (
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {COLUMNS.map((col) => {
                const chainIdx = sortChain.findIndex((s) => s.key === col.key);
                return (
                  <th
                    key={col.key}
                    onClick={(e) => headerClick(col.key, e)}
                    className="cursor-pointer select-none px-2 py-2 text-center first:text-left hover:text-[#0f1e54]"
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
            {visible.map((row) => (
              <tr
                key={`${row.day}|${row.time}`}
                onClick={() => setSelected(row)}
                className="cursor-pointer hover:bg-gray-50"
                title="Click for the games behind this row"
              >
                <td className="px-2 py-2 text-left font-semibold text-gray-700">{row.day}</td>
                <td className="px-2 py-2 text-center text-gray-600">{row.time}</td>
                <td className="px-2 py-2 text-center font-bold text-[#0f1e54]">{formatNumber(row.avg)}</td>
                <td className="px-2 py-2 text-center text-gray-600">{formatNumber(row.total)}</td>
                <td className="px-2 py-2 text-center text-gray-600 underline decoration-dotted">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selected && (
        <GameListModal
          title={`${selected.day} ${selected.time}`}
          subtitle={`Avg ${formatNumber(selected.avg)} - total ${formatNumber(selected.total)} across ${selected.count} game(s)`}
          games={selected.games}
          simulcastInfo={simulcastInfo}
          onClose={() => setSelected(null)}
        />
      )}
    </Card>
  );
}
