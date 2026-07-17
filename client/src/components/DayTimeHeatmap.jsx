import { formatNumber, formatAbbreviated } from '../lib/formatNumber.js';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Sequential, one hue (the app's teal accent), light -> dark by average
// audience - empty combinations stay a neutral, unshaded grey so "no data"
// is never confused with "zero audience".
function cellStyle(value, max) {
  if (value === null) return { background: '#f8fafc', color: '#cbd5e1' };
  const t = max > 0 ? value / max : 0;
  const lightness = 92 - t * 55;
  return { background: `hsl(174, 60%, ${lightness}%)`, color: lightness < 55 ? '#ffffff' : '#0f1e54' };
}

export default function DayTimeHeatmap({ rows }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
        <h3 className="mb-2 text-sm font-bold text-[#0f1e54]">Day + kickoff time heatmap</h3>
        <p className="text-xs text-gray-400">No played games with this data yet.</p>
      </div>
    );
  }

  const days = DAY_ORDER.filter((d) => rows.some((r) => r.day === d));
  const times = [...new Set(rows.map((r) => r.time))].sort((a, b) => a.localeCompare(b));
  const byKey = new Map(rows.map((r) => [`${r.day}|${r.time}`, r]));
  const max = Math.max(...rows.map((r) => r.avg), 1);

  return (
    <div className="w-full overflow-x-auto rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <h3 className="mb-3 text-sm font-bold text-[#0f1e54]">Day + kickoff time heatmap</h3>
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-12" />
            {times.map((t) => (
              <th key={t} className="px-1 pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day}>
              <td className="pr-2 text-right text-[10px] font-bold uppercase tracking-wide text-gray-400">{day}</td>
              {times.map((time) => {
                const cell = byKey.get(`${day}|${time}`) ?? null;
                const style = cellStyle(cell?.avg ?? null, max);
                return (
                  <td key={time} className="p-0.5">
                    <div
                      title={
                        cell ? `${day} ${time} - avg ${formatNumber(cell.avg)} across ${cell.count} game(s)` : `${day} ${time} - no games`
                      }
                      className="flex h-12 w-16 flex-col items-center justify-center rounded-md text-center"
                      style={{ background: style.background, color: style.color }}
                    >
                      {cell && (
                        <>
                          <span className="text-xs font-bold">{formatAbbreviated(cell.avg)}</span>
                          <span className="text-[9px] opacity-70">{cell.count}g</span>
                        </>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
