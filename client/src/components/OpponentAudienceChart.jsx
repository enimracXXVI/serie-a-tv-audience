import Crest from './Crest.jsx';

function formatM(value) {
  return `${(Math.round(value * 100) / 100).toString()}M`;
}

// Which visiting club actually brings the crowd - an average alone hides
// this, but it's exactly what an LED package buyer needs: a Torino-Juventus
// night is not a Torino-Lecce night, even though both count toward the
// same season average.
export default function OpponentAudienceChart({ team, data }) {
  if (!team) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
        <h3 className="mb-2 text-sm font-bold text-[#0f1e54]">Home audience by opponent</h3>
        <p className="text-xs text-gray-400">
          Click a club above to see which visiting opponents draw the biggest audience at their stadium.
        </p>
      </div>
    );
  }

  const { rows, range } = data;
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
        <h3 className="mb-2 text-sm font-bold text-[#0f1e54]">{team.name} - home audience by opponent</h3>
        <p className="text-xs text-gray-400">No played home games yet.</p>
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.avg), 1);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
        <h3 className="text-sm font-bold text-[#0f1e54]">{team.name} - home audience by opponent</h3>
        <span className="text-[10px] text-gray-400">
          Range: {formatM(range.min)} - {formatM(range.max)} across {range.count} home games
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.opponent.slug} className="flex items-center gap-2">
            <Crest team={r.opponent} size={18} />
            <span className="w-24 shrink-0 truncate text-xs font-semibold text-gray-600">{r.opponent.name}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${(r.avg / max) * 100}%`, background: r.opponent.primary || '#94a3b8' }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-bold text-[#0f1e54]">{formatM(r.avg)}</span>
            <span className="w-12 shrink-0 text-right text-[10px] text-gray-400">{r.count}g</span>
          </div>
        ))}
      </div>
    </div>
  );
}
