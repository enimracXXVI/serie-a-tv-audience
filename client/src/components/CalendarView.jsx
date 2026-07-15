import MatchdayGroup from './MatchdayGroup.jsx';
import MatchdayNav from './MatchdayNav.jsx';

export default function CalendarView({
  fixtures,
  onUpdate,
  highlightSlugs = [],
  accent = '#1fd8c9',
  canEdit = false,
  onRequireSignIn,
}) {
  const byMatchday = new Map();
  for (const f of fixtures) {
    if (!byMatchday.has(f.matchday)) byMatchday.set(f.matchday, []);
    byMatchday.get(f.matchday).push(f);
  }
  for (const group of byMatchday.values()) {
    group.sort((a, b) => {
      const dateCompare = (a.date ?? '9999').localeCompare(b.date ?? '9999');
      if (dateCompare !== 0) return dateCompare;
      return (a.kickoffTime ?? '99:99').localeCompare(b.kickoffTime ?? '99:99');
    });
  }
  const matchdays = [...byMatchday.keys()].sort((a, b) => a - b);

  if (fixtures.length === 0) {
    return <p className="text-center text-white/40 py-12">No fixtures to show.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <MatchdayNav matchdays={matchdays} />
      {matchdays.map((md) => (
        <MatchdayGroup
          key={md}
          matchday={md}
          fixtures={byMatchday.get(md)}
          onUpdate={onUpdate}
          highlightSlugs={highlightSlugs}
          accent={accent}
          canEdit={canEdit}
          onRequireSignIn={onRequireSignIn}
        />
      ))}
    </div>
  );
}
