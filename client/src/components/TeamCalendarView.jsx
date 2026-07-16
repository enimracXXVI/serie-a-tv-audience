import { useEffect, useMemo, useState } from 'react';
import MatchdaySelector from './MatchdaySelector.jsx';
import TeamFixtureRow from './TeamFixtureRow.jsx';
import { closestMatchday } from '../lib/matchdays.js';

// A single team's full season as one flat, chronological list (unlike the
// combined CalendarView, each matchday only ever has one fixture for a
// single team, so grouping into per-matchday cards would just be noise).
export default function TeamCalendarView({ fixtures, team, accent = '#1fd8c9' }) {
  const byMatchday = new Map();
  for (const f of fixtures) {
    if (!byMatchday.has(f.matchday)) byMatchday.set(f.matchday, []);
    byMatchday.get(f.matchday).push(f);
  }
  const matchdays = [...byMatchday.keys()].sort((a, b) => a - b);

  // matchdays/byMatchday are recomputed fresh every render from fixtures,
  // so fixtures is the only dependency that should retrigger this memo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultMatchday = useMemo(() => closestMatchday(matchdays, byMatchday), [fixtures]);
  const [selected, setSelected] = useState(defaultMatchday);

  useEffect(() => {
    if (selected === null && defaultMatchday !== null) setSelected(defaultMatchday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMatchday]);

  if (fixtures.length === 0) {
    return <p className="text-center text-white/40 py-12">No fixtures to show.</p>;
  }

  const sorted = [...fixtures].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
  const visible = selected === 'all' ? sorted : sorted.filter((f) => f.matchday === selected);

  return (
    <div className="flex flex-col gap-4">
      <MatchdaySelector matchdays={matchdays} selected={selected ?? matchdays[0]} onChange={setSelected} />
      <div
        className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/20"
        style={{ borderTop: `3px solid ${accent}` }}
      >
        {visible.map((f) => (
          <TeamFixtureRow key={f.id} fixture={f} team={team} />
        ))}
      </div>
    </div>
  );
}
