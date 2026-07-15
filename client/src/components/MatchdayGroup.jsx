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
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <header
        className="flex items-baseline justify-between px-4 py-2.5"
        style={{ borderBottom: `2px solid ${accent}55` }}
      >
        <h3 className="text-sm font-bold tracking-wide text-white">
          Matchday {matchday}
        </h3>
        <span className="text-xs text-white/40">{range}</span>
      </header>
      <div className="divide-y divide-white/[0.04] px-1 py-1">
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
