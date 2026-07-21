import { useState } from 'react';
import Crest from './Crest.jsx';
import SimulcastBadge from './SimulcastBadge.jsx';
import { formatNumber } from '../lib/formatNumber.js';
import GameListModal from './GameListModal.jsx';

// Which visiting club actually brings the crowd - an average alone hides
// this, but it's exactly what an LED package buyer needs: a Torino-Juventus
// night is not a Torino-Lecce night, even though both count toward the
// same season average. Click a row for the actual games behind it - when
// each was played and whether it shared its kickoff slot with anything
// else, both of which affect that game's own audience directly.
export default function OpponentAudienceChart({ team, data, simulcastInfo }) {
  const [selected, setSelected] = useState(null);

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
          Range: {formatNumber(range.min)} - {formatNumber(range.max)} across {range.count} home games
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <button
            key={r.opponent.slug}
            onClick={() => setSelected(r)}
            title="Click for the actual games behind this average"
            className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-gray-50"
          >
            <Crest team={r.opponent} size={18} />
            <span className="w-24 shrink-0 truncate text-xs font-semibold text-gray-600">{r.opponent.name}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${(r.avg / max) * 100}%`, background: r.opponent.primary || '#94a3b8' }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-bold text-[#0f1e54]">{formatNumber(r.avg)}</span>
            <SimulcastBadge fixture={r.games[0].fixture} simulcastInfo={simulcastInfo} />
          </button>
        ))}
      </div>
      {selected && (
        <GameListModal
          title={`${team.name} vs ${selected.opponent.name}`}
          subtitle={`Avg ${formatNumber(selected.avg)} across ${selected.count} home game(s)`}
          games={selected.games}
          simulcastInfo={simulcastInfo}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
