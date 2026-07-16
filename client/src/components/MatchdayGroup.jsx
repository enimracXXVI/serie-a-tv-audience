import { useState } from 'react';
import FixtureRow from './FixtureRow.jsx';

const TABS = [
  { key: 'kickoff', label: 'Kickoff' },
  { key: 'result', label: 'Result' },
  { key: 'audience', label: 'Audience' },
  { key: 'all', label: 'All' },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function MatchdayGroup({ matchday, fixtures, onUpdate, highlightSlugs, accent, canEdit }) {
  const [activeTab, setActiveTab] = useState(null);
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
      <header className="flex flex-col gap-2 px-4 py-2.5 border-b-2" style={{ borderBottomColor: accent }}>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold tracking-wide text-[#0f1e54]">Matchday {matchday}</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{range}</span>
            <a href="#matchday-nav" className="text-xs font-semibold text-gray-400 hover:text-[#0f1e54]">
              ↑ Top
            </a>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab((cur) => (cur === t.key ? null : t.key))}
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  activeTab === t.key ? 'bg-[#0f1e54] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="divide-y divide-gray-100 px-1 py-1">
        {fixtures.map((f) => (
          <FixtureRow
            key={f.id}
            fixture={f}
            onUpdate={onUpdate}
            highlightSlugs={highlightSlugs}
            canEdit={canEdit}
            editMode={activeTab}
          />
        ))}
      </div>
    </section>
  );
}
