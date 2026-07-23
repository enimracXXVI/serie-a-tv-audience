import { useState } from 'react';
import CupFixtureRow from './CupFixtureRow.jsx';
import CupTieGroup from './CupTieGroup.jsx';
import { groupIntoTies, tieKeyFor } from '../lib/cupFixtures.js';

const TABS = [
  { key: 'kickoff', label: 'Kickoff' },
  { key: 'result', label: 'Result' },
  { key: 'addedTime', label: 'Added time' },
  { key: 'audience', label: 'Audience' },
  { key: 'led', label: 'LED' },
  { key: 'all', label: 'All' },
];

// Cup accent - violet rather than Serie A's navy, so a round reads as its
// own distinct competition context rather than a re-skinned matchday card,
// while still using the exact same white-card-with-accent-border structure
// as MatchdayGroup (previously this was a solid navy header, which read as
// a disconnected floating box rather than part of the same fixture list).
const ACCENT = '#6d28d9';

// One shared editMode tab row per round, controlling every fixture (and both
// legs of a tie) in it at once - same position and split as Serie A's
// MatchdayGroup, rather than each row managing its own separate open/closed
// tab like before.
export default function CupRoundGroup({ round, fixtures, onUpdate, onDelete, canEdit, broadcasters }) {
  const [activeTab, setActiveTab] = useState(null);

  return (
    <section className="scroll-mt-4 overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/20">
      <header className="flex flex-col gap-2 border-b-2 px-4 py-2.5" style={{ borderBottomColor: ACCENT }}>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold tracking-wide" style={{ color: ACCENT }}>
            {round}
          </h3>
          <a href="#cup-nav" className="text-xs font-semibold text-gray-400 hover:text-[#0f1e54]">
            ↑ Top
          </a>
        </div>
        {canEdit && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab((cur) => (cur === t.key ? null : t.key))}
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  activeTab === t.key ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                style={activeTab === t.key ? { background: ACCENT } : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="flex flex-col divide-y divide-gray-100 px-1 py-1">
        {groupIntoTies(fixtures).map((legs) =>
          legs.length === 2 ? (
            <CupTieGroup
              key={tieKeyFor(legs[0])}
              legs={legs}
              onUpdate={onUpdate}
              onDelete={onDelete}
              canEdit={canEdit}
              editMode={activeTab}
              broadcasters={broadcasters}
            />
          ) : (
            legs.map((f) => (
              <CupFixtureRow
                key={f.id}
                fixture={f}
                onUpdate={onUpdate}
                onDelete={onDelete}
                canEdit={canEdit}
                editMode={activeTab}
                broadcasters={broadcasters}
              />
            ))
          )
        )}
      </div>
    </section>
  );
}
