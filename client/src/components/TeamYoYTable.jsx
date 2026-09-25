import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
import Card from './Card.jsx';
import MatchdaySlider from './MatchdaySlider.jsx';
import VariancePill from './VariancePill.jsx';
import { formatNumber } from '../lib/formatNumber.js';

export default function TeamYoYTable({ rows, currentLabel, previousLabel, matchday, maxMatchday, onMatchdayChange }) {
  // Sortable by clicking a header, same as the Club table below it - sorting
  // by the RAW (signed) variance, not its absolute value, so a -70% lands
  // where -70% actually belongs instead of next to +71%.
  const columns = useMemo(
    () => [
      { key: 'team', label: 'Club', sortable: false },
      { key: 'previousAvg', label: `${previousLabel} avg` },
      { key: 'currentAvg', label: `${currentLabel} avg` },
      { key: 'deltaPct', label: 'Variation', title: 'Change vs the previous season, high to low' },
    ],
    [previousLabel, currentLabel]
  );

  const [sortChain, setSortChain] = useState([{ key: 'deltaPct', dir: 'desc' }]);
  const [multiSort, setMultiSort] = useState(false);

  // Shift+click still works for anyone using a mouse - the "Multi-sort"
  // toggle (mobile-only) is purely an additional touch equivalent for it,
  // same convention as the Club table.
  function headerClick(key, event) {
    if (key === 'team') return;
    setSortChain((prev) => {
      if (!multiSort && !event.shiftKey) {
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

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      for (const { key, dir } of sortChain) {
        const mul = dir === 'asc' ? 1 : -1;
        const cmp = key === 'team' ? a.team.name.localeCompare(b.team.name) : a[key] - b[key];
        if (cmp !== 0) return cmp * mul;
      }
      return 0;
    });
    return list;
  }, [rows, sortChain]);

  if (!previousLabel) {
    return (
      <Card title="Audience by club, year on year">
        <p className="text-xs text-gray-400">No earlier season on record to compare {currentLabel} against yet.</p>
      </Card>
    );
  }

  const matchdayReadout = maxMatchday > 1 && (
    <span className="text-xs font-semibold text-[#0f1e54]/70">Through matchday {matchday}</span>
  );
  const multiSortButton = (
    <button
      type="button"
      onClick={() => setMultiSort((v) => !v)}
      title="When on, tapping a column adds it to the sort instead of replacing it"
      className={`rounded-full px-2.5 py-1 text-xs font-bold sm:hidden ${
        multiSort ? 'bg-white text-[#0f1e54]' : 'bg-black/10 text-[#0f1e54]/70 hover:bg-black/20'
      }`}
    >
      Multi-sort
    </button>
  );
  const controls = (
    <>
      {matchdayReadout}
      {sorted.length > 0 && multiSortButton}
    </>
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
            {columns.map((col) => {
              const chainIdx = sortChain.findIndex((s) => s.key === col.key);
              return (
                <th
                  key={col.key}
                  title={col.title}
                  onClick={(e) => headerClick(col.key, e)}
                  className={`px-3 py-2.5 text-center first:text-left ${
                    col.sortable === false ? '' : 'cursor-pointer select-none hover:text-[#0f1e54]'
                  }`}
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
            })}
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
