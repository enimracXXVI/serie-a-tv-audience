import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
import { formatNumber } from '../lib/formatNumber.js';

// Same convention as the Fixtures page (FixtureRow's formatDateShort) - day,
// short month, 2-digit year - so a date reads identically everywhere in the
// app instead of this card inventing its own shorter format.
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
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

function compareValue(key, a, b) {
  if (key === 'opponent') return (a.fixture.away.name ?? '').localeCompare(b.fixture.away.name ?? '');
  if (key === 'matchday') return (a.fixture.matchday ?? 0) - (b.fixture.matchday ?? 0);
  if (key === 'penalty') return Number(Boolean(a.penaltyExposure)) - Number(Boolean(b.penaltyExposure));
  return (a[key] ?? 0) - (b[key] ?? 0);
}

function SortableTh({ col, sortChain, onHeaderClick, className = '' }) {
  const chainIdx = sortChain.findIndex((s) => s.key === col.key);
  return (
    <th
      onClick={(e) => onHeaderClick(col.key, e)}
      className={`cursor-pointer select-none px-2 py-2 hover:text-[#0f1e54] ${className}`}
    >
      {col.label}
      {chainIdx !== -1 && (
        <span className="ml-0.5">
          {sortChain[chainIdx].dir === 'asc' ? '▲' : '▼'}
          {sortChain.length > 1 && <sup>{chainIdx + 1}</sup>}
        </span>
      )}
    </th>
  );
}

const COLUMNS = [
  { key: 'matchday', label: 'Game', className: 'text-left' },
  { key: 'opponent', label: 'Opponent', className: 'text-left' },
  { key: 'minutes', label: 'LED minutes', className: 'text-center' },
  { key: 'audience', label: 'Audience', className: 'text-center' },
  { key: 'penalty', label: 'Penalty', className: 'text-center' },
];

const GOAL_CARPET_COLUMNS = [
  { key: 'matchday', label: 'Game', className: 'text-left' },
  { key: 'opponent', label: 'Opponent', className: 'text-left' },
  { key: 'audience', label: 'Audience', className: 'text-center' },
];

function useSortedGames(exposure, sortChain) {
  return useMemo(() => {
    if (!exposure?.games) return [];
    const list = [...exposure.games];
    list.sort((a, b) => {
      for (const { key, dir } of sortChain) {
        const mul = dir === 'asc' ? 1 : -1;
        const cmp = compareValue(key, a, b);
        if (cmp !== 0) return cmp * mul;
      }
      return 0;
    });
    return list;
  }, [exposure, sortChain]);
}

// Minutes (how long the board ran) and audience (how many people watched
// the match at all) are shown side by side, never multiplied together -
// duration doesn't scale reach, and a viewer watching the board for twice
// as long isn't twice as aware of the brand. Scoped to this club's own
// home games, same as everywhere else LED is tracked (see teams.js).
export default function LedExposureCard({ team, exposure }) {
  const [sortChain, setSortChain] = useState([{ key: 'matchday', dir: 'asc' }]);

  function headerClick(key, event) {
    setSortChain((prev) => {
      if (!event.shiftKey) {
        if (prev.length === 1 && prev[0].key === key) {
          return [{ key, dir: prev[0].dir === 'asc' ? 'desc' : 'asc' }];
        }
        return [{ key, dir: 'desc' }];
      }
      const idx = prev.findIndex((s) => s.key === key);
      if (idx === -1) return [...prev, { key, dir: 'desc' }];
      const next = [...prev];
      next[idx] = { key, dir: next[idx].dir === 'asc' ? 'desc' : 'asc' };
      return next;
    });
  }

  const sortedGames = useSortedGames(exposure, sortChain);

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

  // Goal-carpet-only: no per-fixture minutes concept at all (see
  // hasLedMinutesConcept in teams.js) - just the reach those home games got.
  if (exposure.goalCarpetOnly) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
        <h3 className="text-sm font-bold text-[#0f1e54]">{team.name} - LED exposure</h3>
        <p className="mb-3 text-[10px] text-gray-400">Goal carpet branding only - no per-fixture LED minutes to report.</p>
        <div className="mb-3 text-center">
          <p className="text-xl font-black text-[#0f1e54]">{formatNumber(exposure.totalAudience)}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Total audience across {exposure.count} home game{exposure.count === 1 ? '' : 's'}
          </p>
        </div>
        <p className="mb-2 text-[10px] text-gray-400">Shift+click a column to sort by multiple columns</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                {GOAL_CARPET_COLUMNS.map((col) => (
                  <SortableTh key={col.key} col={col} sortChain={sortChain} onHeaderClick={headerClick} className={col.className} />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedGames.map((g) => (
                <tr key={g.fixture.id}>
                  <td className="px-2 py-2 text-left">
                    <span className="font-semibold text-gray-700">MD{g.fixture.matchday}</span>
                    <span className="ml-1 text-gray-400">{formatDate(g.fixture.date)}</span>
                  </td>
                  <td className="px-2 py-2 text-left">
                    <div className="flex items-center gap-1.5">
                      <Crest team={g.fixture.away} size={16} />
                      <span className="font-semibold text-gray-700">{g.fixture.away.short ?? g.fixture.away.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center text-gray-600">{formatNumber(g.audience)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <h3 className="text-sm font-bold text-[#0f1e54]">{team.name} - LED exposure</h3>
      <p className="mb-3 text-[10px] text-gray-400">
        Minutes and audience reported separately, not multiplied - duration doesn&apos;t scale reach.
      </p>
      <div className="mb-3 grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-xl font-black text-[#0f1e54]">{formatNumber(exposure.totalMinutes)} min</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
            LED delivered across {exposure.count} home game{exposure.count === 1 ? '' : 's'}
          </p>
        </div>
        <div>
          <p className="text-xl font-black text-[#0f1e54]">{formatNumber(exposure.totalAudience)}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Total audience, those same {exposure.count} game{exposure.count === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      <p className="mb-2 text-[10px] text-gray-400">Shift+click a column to sort by multiple columns</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {COLUMNS.map((col) => (
                <SortableTh key={col.key} col={col} sortChain={sortChain} onHeaderClick={headerClick} className={col.className} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedGames.map((g) => (
              <tr key={g.fixture.id}>
                <td className="px-2 py-2 text-left">
                  <span className="font-semibold text-gray-700">MD{g.fixture.matchday}</span>
                  <span className="ml-1 text-gray-400">{formatDate(g.fixture.date)}</span>
                </td>
                <td className="px-2 py-2 text-left">
                  <div className="flex items-center gap-1.5">
                    <Crest team={g.fixture.away} size={16} />
                    <span className="font-semibold text-gray-700">{g.fixture.away.short ?? g.fixture.away.name}</span>
                  </div>
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
