import { useEffect } from 'react';
import Crest from './Crest.jsx';
import SimulcastBadge from './SimulcastBadge.jsx';
import { formatNumber } from '../lib/formatNumber.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

// One row per game - the context a bare average/count hides: which
// matchday, which two clubs, when exactly, and whether this game shared
// its kickoff slot with others (which directly affects its own audience,
// since a shared slot splits attention across every game in it).
function GameRow({ fixture, audience, simulcastInfo }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-50 py-2 last:border-0">
      <div className="flex w-16 shrink-0 flex-col items-center text-center text-[10px] leading-tight text-gray-400">
        <span className="font-bold text-gray-500">MD{fixture.matchday}</span>
        <span className="whitespace-nowrap">{formatDate(fixture.date)}</span>
        <span className="whitespace-nowrap">
          {fixture.day} {fixture.kickoffTime}
        </span>
      </div>
      <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1 min-w-0">
        <div className="flex items-center justify-end gap-1.5 min-w-0">
          {fixture.home.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
          <span className="truncate text-xs text-gray-700">{fixture.home.short ?? fixture.home.name}</span>
          <Crest team={fixture.home} size={16} />
        </div>
        <span className="px-1 text-[10px] text-gray-300">vs</span>
        <div className="flex items-center gap-1.5 min-w-0">
          <Crest team={fixture.away} size={16} />
          <span className="truncate text-xs text-gray-700">{fixture.away.short ?? fixture.away.name}</span>
          {fixture.away.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
        </div>
      </div>
      <SimulcastBadge fixture={fixture} simulcastInfo={simulcastInfo} />
      <span className="w-16 shrink-0 text-right text-xs font-bold text-[#0f1e54]">{formatNumber(audience)}</span>
    </div>
  );
}

// Shared by the heatmap, the day+kickoff breakdown table, and the
// home-audience-by-opponent chart - click/tap any of those (a cell, a row)
// to see exactly which games it's made of, since an average or a total
// alone hides when each one was actually played and whether it shared its
// slot with anything else. Click/tap works identically on touch and mouse,
// so no separate hover-vs-touch handling is needed.
export default function GameListModal({ title, subtitle, games, simulcastInfo, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-[#0f1e54]">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#0f1e54]"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-1">
          {games.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">No games here.</p>
          ) : (
            games.map(({ fixture, audience }) => (
              <GameRow key={fixture.id} fixture={fixture} audience={audience} simulcastInfo={simulcastInfo} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
