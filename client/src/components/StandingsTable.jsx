import Crest from './Crest.jsx';

export default function StandingsTable({ standings }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-lg shadow-black/20">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            <th className="px-3 py-2.5 text-left">#</th>
            <th className="px-2 py-2.5 text-left">Club</th>
            <th className="px-2 py-2.5 text-center">P</th>
            <th className="px-2 py-2.5 text-center">W</th>
            <th className="px-2 py-2.5 text-center">D</th>
            <th className="px-2 py-2.5 text-center">L</th>
            <th className="px-2 py-2.5 text-center">GF</th>
            <th className="px-2 py-2.5 text-center">GA</th>
            <th className="px-2 py-2.5 text-center">GD</th>
            <th className="px-3 py-2.5 text-center">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {standings.map((row, i) => {
            const gd = row.goalsFor - row.goalsAgainst;
            return (
              <tr key={row.slug} className={row.team.sponsored ? 'bg-[#1fd8c9]/5' : undefined}>
                <td className="px-3 py-2 text-left font-bold text-gray-400">{i + 1}</td>
                <td className="px-2 py-2 text-left">
                  <div className="flex items-center gap-2">
                    <Crest team={row.team} size={20} />
                    <span className="truncate font-semibold text-[#0f1e54]">{row.team.name}</span>
                    {row.team.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
                  </div>
                </td>
                <td className="px-2 py-2 text-center text-gray-600">{row.played}</td>
                <td className="px-2 py-2 text-center text-gray-600">{row.won}</td>
                <td className="px-2 py-2 text-center text-gray-600">{row.drawn}</td>
                <td className="px-2 py-2 text-center text-gray-600">{row.lost}</td>
                <td className="px-2 py-2 text-center text-gray-600">{row.goalsFor}</td>
                <td className="px-2 py-2 text-center text-gray-600">{row.goalsAgainst}</td>
                <td className="px-2 py-2 text-center text-gray-600">
                  {gd > 0 ? `+${gd}` : gd}
                </td>
                <td className="px-3 py-2 text-center text-base font-black text-[#0f1e54]">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
