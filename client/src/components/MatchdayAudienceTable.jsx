import { formatNumber } from '../lib/formatNumber.js';
import Card from './Card.jsx';

// The trend chart plots the shape of the season (rising/falling averages),
// but "how many people in total watched matchday N" is its own separate
// question a chart's y-axis can't answer well alongside a per-game average
// (the two numbers live on completely different scales) - so total and
// average both get their own plain column here instead of being squeezed
// onto the chart.
export default function MatchdayAudienceTable({ trend, team }) {
  return (
    <Card title="Audience by matchday" bodyClassName="overflow-x-auto p-4">
      {trend.length === 0 ? (
        <p className="text-xs text-gray-400">No played games yet.</p>
      ) : (
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              <th className="px-2 py-2 text-left">Matchday</th>
              <th className="px-2 py-2 text-center">Games</th>
              <th className="px-2 py-2 text-center">Total audience</th>
              <th className="px-2 py-2 text-center">Avg audience</th>
              {team && <th className="px-2 py-2 text-center">{team.name}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {trend.map((row) => (
              <tr key={row.matchday}>
                <td className="px-2 py-2 text-left font-semibold text-gray-700">MD{row.matchday}</td>
                <td className="px-2 py-2 text-center text-gray-600">{row.gamesPlayed}</td>
                <td className="px-2 py-2 text-center font-bold text-[#0f1e54]">{formatNumber(row.leagueTotal)}</td>
                <td className="px-2 py-2 text-center text-gray-600">{formatNumber(row.leagueAvg)}</td>
                {team && (
                  <td className="px-2 py-2 text-center text-gray-600">
                    {row.teamValue !== null ? formatNumber(row.teamValue) : '-'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
