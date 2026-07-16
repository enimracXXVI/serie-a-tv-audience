import { useEffect, useState } from 'react';
import TeamFixtureRow from './TeamFixtureRow.jsx';
import { computeMatchTags } from '../lib/matchTags.js';

// CSS multi-column (`columns-N`) lets the browser balance column heights
// itself, which - for otherwise-equal-height cards - can still put the
// "extra" item in a different column from one team's page to the next,
// looking inconsistent. Column count and item placement are both computed
// here instead, so the split is always the same deterministic pattern.
const BREAKPOINTS = [
  { minWidth: 1280, columns: 3 }, // matches Tailwind's xl:
  { minWidth: 640, columns: 2 }, // matches Tailwind's sm:
];

function getColumnCount() {
  if (typeof window === 'undefined') return 1;
  const match = BREAKPOINTS.find((b) => window.innerWidth >= b.minWidth);
  return match ? match.columns : 1;
}

function useColumnCount() {
  const [count, setCount] = useState(getColumnCount);
  useEffect(() => {
    function onResize() {
      setCount(getColumnCount());
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return count;
}

// Column i gets one extra item for every i less than (total % columns), so
// e.g. 38 items over 3 columns is always 13/13/12, never 12/13/13.
function splitIntoColumns(items, columns) {
  const base = Math.floor(items.length / columns);
  const remainder = items.length % columns;
  const result = [];
  let start = 0;
  for (let i = 0; i < columns; i++) {
    const size = base + (i < remainder ? 1 : 0);
    result.push(items.slice(start, start + size));
    start += size;
  }
  return result;
}

// A single team's full season as one continuous, chronological list - every
// matchday one after another rather than filtered/paged, laid out in
// multiple columns once there's enough width for it.
export default function TeamCalendarView({ fixtures, team, accent = '#1fd8c9' }) {
  const columnCount = useColumnCount();

  if (fixtures.length === 0) {
    return <p className="text-center text-white/40 py-12">No fixtures to show.</p>;
  }

  const sorted = [...fixtures]
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
    .map((f) => Object.assign(f, computeMatchTags(f)));
  const columns = splitIntoColumns(sorted, columnCount);

  return (
    <div className="flex gap-3">
      {columns.map((column, i) => (
        <div key={i} className="flex flex-1 flex-col gap-3">
          {column.map((f) => (
            <div
              key={f.id}
              className="overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/20"
              style={{ borderTop: `3px solid ${accent}` }}
            >
              <TeamFixtureRow fixture={f} team={team} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
