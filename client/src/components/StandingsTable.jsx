import Crest from './Crest.jsx';
import Card from './Card.jsx';

export default function StandingsTable({ standings, matchday, maxMatchday, onMatchdayChange }) {
  return (
    <Card
      title={matchday >= maxMatchday ? 'Current standing' : `Standing at matchday ${matchday}`}
      bodyClassName=""
      controls={
        <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
          <input
            type="range"
            min={1}
            max={maxMatchday}
            value={matchday}
            onChange={(e) => onMatchdayChange(Number(e.target.value))}
            className="w-full accent-[#0f1e54]"
          />
          <span className="w-14 shrink-0 text-right text-xs font-semibold text-[#0f1e54]">MD {matchday}</span>
        </div>
      }
    >
      <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            <th className="px-3 py-1.5 text-left">#</th>
            <th className="px-2 py-1.5 text-left">Club</th>
            <th className="px-2 py-1.5 text-center">P</th>
            <th className="px-2 py-1.5 text-center">W</th>
            <th className="px-2 py-1.5 text-center">D</th>
            <th className="px-2 py-1.5 text-center">L</th>
            <th className="px-2 py-1.5 text-center">GF</th>
            <th className="px-2 py-1.5 text-center">GA</th>
            <th className="px-2 py-1.5 text-center">GD</th>
            <th className="px-3 py-1.5 text-center">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {standings.map((row, i) => {
            const gd = row.goalsFor - row.goalsAgainst;
            return (
              <tr key={row.slug} className={row.team.sponsored ? 'bg-[#1fd8c9]/5' : undefined}>
                <td className="px-3 py-1 text-left font-bold text-gray-400">{i + 1}</td>
                <td className="px-2 py-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <Crest team={row.team} size={17} />
                    <span className="truncate font-semibold text-[#0f1e54]">{row.team.name}</span>
                    {row.team.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
                  </div>
                </td>
                <td className="px-2 py-1 text-center text-gray-600">{row.played}</td>
                <td className="px-2 py-1 text-center text-gray-600">{row.won}</td>
                <td className="px-2 py-1 text-center text-gray-600">{row.drawn}</td>
                <td className="px-2 py-1 text-center text-gray-600">{row.lost}</td>
                <td className="px-2 py-1 text-center text-gray-600">{row.goalsFor}</td>
                <td className="px-2 py-1 text-center text-gray-600">{row.goalsAgainst}</td>
                <td className="px-2 py-1 text-center text-gray-600">
                  {gd > 0 ? `+${gd}` : gd}
                </td>
                <td className="px-3 py-1 text-center text-sm font-black text-[#0f1e54]">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </Card>
  );
}
