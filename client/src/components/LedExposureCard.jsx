import { formatNumber } from '../lib/formatNumber.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// "5 base + 2 extra + 3 AT" - only the parts that actually apply to this
// game, so a plain contracted-rate game (the common case) just shows its
// one number instead of "5 base + 0 extra + 0 AT" noise every row.
function minutesBreakdown(game) {
  const parts = [];
  if (game.base) parts.push(`${game.base} base`);
  if (game.extra) parts.push(`+${game.extra} extra`);
  if (game.addedTime) parts.push(`+${game.addedTime} AT`);
  return parts.join(' ');
}

// Minutes (how long the board ran) and audience (how many people watched
// the match at all) are shown side by side, never multiplied together -
// duration doesn't scale reach, and a viewer watching the board for twice
// as long isn't twice as aware of the brand. Scoped to this club's own
// home games, same as everywhere else LED is tracked (see teams.js).
export default function LedExposureCard({ team, exposure }) {
  if (!team) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
        <h3 className="mb-2 text-sm font-bold text-[#0f1e54]">LED exposure</h3>
        <p className="text-xs text-gray-400">Click a club above to see its LED perimeter-board minutes and audience.</p>
      </div>
    );
  }
  if (!exposure) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
        <h3 className="mb-2 text-sm font-bold text-[#0f1e54]">LED exposure</h3>
        <p className="text-xs text-gray-400">{team.name} has no LED perimeter-board deal this season.</p>
      </div>
    );
  }
  if (exposure.count === 0) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
        <h3 className="mb-2 text-sm font-bold text-[#0f1e54]">{team.name} - LED exposure</h3>
        <p className="text-xs text-gray-400">No home games played yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <h3 className="text-sm font-bold text-[#0f1e54]">{team.name} - LED exposure</h3>
      <p className="mb-3 text-[10px] text-gray-400">
        Minutes and audience reported separately, not multiplied - duration doesn&apos;t scale reach.
      </p>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xl font-black text-[#0f1e54]">{formatNumber(exposure.totalMinutes)} min</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
            LED delivered across {exposure.count} home game{exposure.count === 1 ? '' : 's'}
          </p>
        </div>
        <div>
          <p className="text-xl font-black text-[#0f1e54]">{formatNumber(exposure.totalAudience)}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Combined audience, same games</p>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              <th className="px-2 py-2 text-left">Game</th>
              <th className="px-2 py-2 text-center">LED minutes</th>
              <th className="px-2 py-2 text-center">Audience</th>
              <th className="px-2 py-2 text-center">Penalty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {exposure.games.map((g) => (
              <tr key={g.fixture.id}>
                <td className="px-2 py-2 text-left">
                  <span className="font-semibold text-gray-700">
                    MD{g.fixture.matchday} vs {g.fixture.away.short ?? g.fixture.away.name}
                  </span>
                  <span className="ml-1 text-gray-400">{formatDate(g.fixture.date)}</span>
                </td>
                <td className="px-2 py-2 text-center">
                  <span className="font-bold text-[#0f1e54]">{g.minutes} min</span>
                  {minutesBreakdown(g) && <div className="text-[10px] text-gray-400">{minutesBreakdown(g)}</div>}
                </td>
                <td className="px-2 py-2 text-center text-gray-600">{formatNumber(g.audience)}</td>
                <td className="px-2 py-2 text-center">
                  {g.penaltyExposure && (
                    <span
                      title="A penalty was taken during this match"
                      className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700"
                    >
                      Yes
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
