import { useMemo } from 'react';
import Crest from './Crest.jsx';
import Card from './Card.jsx';
import MatchdaySlider from './MatchdaySlider.jsx';
import VariancePill from './VariancePill.jsx';
import { formatNumber } from '../lib/formatNumber.js';

export default function TeamYoYTable({ rows, currentLabel, previousLabel, matchday, maxMatchday, onMatchdayChange }) {
  // Biggest movers first (either direction) - a flat "same as last year"
  // club is the least interesting row here, not the most, so it sinks to
  // the bottom.
  const sorted = useMemo(
    () => [...rows].sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0)),
    [rows]
  );

  if (!previousLabel) {
    return (
      <Card title="Audience by club, year on year">
        <p className="text-xs text-gray-400">No earlier season on record to compare {currentLabel} against yet.</p>
      </Card>
    );
  }

  const controls = maxMatchday > 1 && (
    <span className="text-xs font-semibold text-[#0f1e54]/70">Through matchday {matchday}</span>
  );

  if (sorted.length === 0) {
    return (
      <Card title="Audience by club, year on year" controls={controls}>
        <MatchdaySlider value={matchday} max={maxMatchday} onChange={onMatchdayChange} />
        <p className="text-xs text-gray-400">
          No club has played its first {matchday} matchday{matchday === 1 ? '' : 's'} at home in both {previousLabel} and{' '}
          {currentLabel} yet.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Audience by club, year on year" controls={controls} bodyClassName="overflow-x-auto p-4">
      <MatchdaySlider value={matchday} max={maxMatchday} onChange={onMatchdayChange} />
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
                <VariancePill delta={row.delta} deltaPct={row.deltaPct} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
