import { useMemo, useState } from 'react';

function formatM(value) {
  return `${(Math.round(value * 100) / 100).toString()}M`;
}

export default function DayTimeBreakdownTable({ rows }) {
  const [sortKey, setSortKey] = useState('avg');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      if (sortKey === 'day' || sortKey === 'time') return a[sortKey].localeCompare(b[sortKey]) * (sortDir === 'asc' ? 1 : -1);
      return (a[sortKey] - b[sortKey]) * (sortDir === 'asc' ? 1 : -1);
    });
    return list;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const columns = [
    { key: 'day', label: 'Day' },
    { key: 'time', label: 'Kickoff' },
    { key: 'avg', label: 'Avg audience' },
    { key: 'total', label: 'Total' },
    { key: 'count', label: 'Games' },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <h3 className="mb-3 text-sm font-bold text-[#0f1e54]">Day + kickoff time breakdown</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">No played games with this data yet.</p>
      ) : (
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer select-none px-2 py-2 text-center first:text-left hover:text-[#0f1e54]"
                >
                  {col.label}
                  {sortKey === col.key && <span className="ml-0.5">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((row) => (
              <tr key={`${row.day}|${row.time}`}>
                <td className="px-2 py-2 text-left font-semibold text-gray-700">{row.day}</td>
                <td className="px-2 py-2 text-center text-gray-600">{row.time}</td>
                <td className="px-2 py-2 text-center font-bold text-[#0f1e54]">{formatM(row.avg)}</td>
                <td className="px-2 py-2 text-center text-gray-600">{formatM(row.total)}</td>
                <td className="px-2 py-2 text-center text-gray-600">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
