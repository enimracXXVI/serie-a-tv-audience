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

// Cup accent - a bold red rather than Serie A's navy, so a round reads as
// its own distinct competition context (echoing Coppa Italia's own red
// livery) at a glance, not a re-skinned matchday card. The header carries a
// solid fill (not just a coloured border) and the body gets a faint red
// tint, while still living inside the same single card as the fixture
// list below it - part of the list, not a disconnected floating box.
const ACCENT = '#b91c1c';

// One shared editMode tab row per round, controlling every fixture (and both
// legs of a tie) in it at once - same position and split as Serie A's
// MatchdayGroup, rather than each row managing its own separate open/closed
// tab like before.
export default function CupRoundGroup({ round, fixtures, onUpdate, onDelete, canEdit, broadcasters }) {
  const [activeTab, setActiveTab] = useState(null);

  return (
    <section className="scroll-mt-4 overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/20">
      <header className="flex flex-col gap-2 px-4 py-2.5" style={{ background: ACCENT }}>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold tracking-wide text-white">{round}</h3>
          <a href="#cup-nav" className="text-xs font-semibold text-white/70 hover:text-white">
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
                  activeTab === t.key ? 'bg-white' : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                style={activeTab === t.key ? { color: ACCENT } : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="flex flex-col">
        {groupIntoTies(fixtures).map((legs, i) => (
          <div key={legs.length === 2 ? tieKeyFor(legs[0]) : legs[0].id} style={i > 0 ? { borderTop: `1px solid ${ACCENT}33` } : undefined}>
            {legs.length === 2 ? (
              <CupTieGroup
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
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
