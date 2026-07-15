import FixtureRow from './FixtureRow.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function MatchdayGroup({ matchday, fixtures, onUpdate, highlightSlugs, accent, canEdit, onRequireSignIn }) {
  const dates = fixtures.map((f) => f.date).filter(Boolean);
  const range =
    dates.length > 0
      ? dates[0] === dates[dates.length - 1]
        ? formatDate(dates[0])
        : `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`
      : '';

  return (
    <section
      id={`matchday-${matchday}`}
      className="scroll-mt-4 rounded-2xl bg-white overflow-hidden shadow-lg shadow-black/20"
    >
      <header
        className="flex items-baseline justify-between px-4 py-2.5 border-b-2"
        style={{ borderBottomColor: accent }}
      >
        <h3 className="text-sm font-bold tracking-wide text-[#0f1e54]">
          Matchday {matchday}
        </h3>
        <span className="text-xs text-gray-400">{range}</span>
      </header>
      <div className="divide-y divide-gray-100 px-1 py-1">
        {fixtures.map((f) => (
          <FixtureRow
            key={f.id}
            fixture={f}
            onUpdate={onUpdate}
            highlightSlugs={highlightSlugs}
            canEdit={canEdit}
            onRequireSignIn={onRequireSignIn}
          />
        ))}
      </div>
    </section>
  );
}
