import MatchdayGroup from './MatchdayGroup.jsx';

export default function CalendarView({ fixtures, onUpdate, highlightSlugs = [], accent = '#c084fc' }) {
  const byMatchday = new Map();
  for (const f of fixtures) {
    if (!byMatchday.has(f.matchday)) byMatchday.set(f.matchday, []);
    byMatchday.get(f.matchday).push(f);
  }
  const matchdays = [...byMatchday.keys()].sort((a, b) => a - b);

  if (fixtures.length === 0) {
    return <p className="text-center text-white/40 py-12">No fixtures to show.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {matchdays.map((md) => (
        <MatchdayGroup
          key={md}
          matchday={md}
          fixtures={byMatchday.get(md)}
          onUpdate={onUpdate}
          highlightSlugs={highlightSlugs}
          accent={accent}
        />
      ))}
    </div>
  );
}
