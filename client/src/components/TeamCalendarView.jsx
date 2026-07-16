import TeamFixtureRow from './TeamFixtureRow.jsx';
import { computeMatchTags } from '../lib/matchTags.js';

// A single team's full season as one continuous, chronological list - every
// matchday one after another rather than filtered/paged, laid out in
// multiple columns once there's enough width for it.
export default function TeamCalendarView({ fixtures, team, accent = '#1fd8c9' }) {
  if (fixtures.length === 0) {
    return <p className="text-center text-white/40 py-12">No fixtures to show.</p>;
  }

  const sorted = [...fixtures]
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
    .map((f) => Object.assign(f, computeMatchTags(f)));

  return (
    <div className="columns-1 gap-3 sm:columns-2 xl:columns-3">
      {sorted.map((f) => (
        <div
          key={f.id}
          className="mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/20"
          style={{ borderTop: `3px solid ${accent}` }}
        >
          <TeamFixtureRow fixture={f} team={team} />
        </div>
      ))}
    </div>
  );
}
