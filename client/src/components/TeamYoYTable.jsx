import { useMemo } from 'react';
import Crest from './Crest.jsx';
import Card from './Card.jsx';
import { formatNumber } from '../lib/formatNumber.js';

// Green/red only mean something once there's an actual prior figure to
// compare against - a club with no home games in one of the two seasons
// (promoted/relegated since, or just hasn't played yet) shows a plain dash,
// never a misleading 0% or a false "increase" against nothing.
function VarianceCell({ delta, deltaPct }) {
  if (delta === null || deltaPct === null) {
    return <span className="text-gray-300">—</span>;
  }
  if (delta === 0) {
    return <span className="font-semibold text-gray-500">No change</span>;
  }
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
      {up ? '▲' : '▼'} {formatNumber(Math.abs(delta))} ({up ? '+' : '-'}
      {Math.abs(deltaPct).toFixed(1)}%)
    </span>
  );
}

export default function TeamYoYTable({ rows, currentLabel, previousLabel }) {
  // Biggest movers first (either direction) - a flat "same as last year"
  // club is the least interesting row here, not the most, so it sinks to
  // the bottom along with the "no prior data" ones rather than sorting
  // alphabetically past them.
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (a.deltaPct === null && b.deltaPct === null) return a.team.name.localeCompare(b.team.name);
        if (a.deltaPct === null) return 1;
        if (b.deltaPct === null) return -1;
        return Math.abs(b.deltaPct) - Math.abs(a.deltaPct);
      }),
    [rows]
  );

  if (!previousLabel) {
    return (
      <Card title="Audience by club, year on year">
        <p className="text-xs text-gray-400">No earlier season on record to compare {currentLabel} against yet.</p>
      </Card>
    );
  }

  return (
    <Card title="Audience by club, year on year" bodyClassName="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            <th className="px-3 py-2.5 text-left">Club</th>
            <th className="px-2 py-2.5 text-center">{previousLabel} avg</th>
            <th className="px-2 py-2.5 text-center">{currentLabel} avg</th>
            <th className="px-2 py-2.5 text-center">Variation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((row) => (
            <tr key={row.team.slug} className={row.team.sponsored ? 'bg-[#1fd8c9]/5' : undefined}>
              <td className="px-3 py-2 text-left">
                <div className="flex items-center gap-2">
                  <Crest team={row.team} size={20} />
                  <span className={`truncate font-semibold ${row.team.sponsored ? 'text-[#0f1e54]' : 'text-gray-700'}`}>{row.team.name}</span>
                  {row.team.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
                </div>
              </td>
              <td className="px-2 py-2 text-center text-gray-600">{formatNumber(row.previousAvg)}</td>
              <td className="px-2 py-2 text-center text-gray-600">{formatNumber(row.currentAvg)}</td>
              <td className="px-2 py-2 text-center">
                <VarianceCell delta={row.delta} deltaPct={row.deltaPct} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
