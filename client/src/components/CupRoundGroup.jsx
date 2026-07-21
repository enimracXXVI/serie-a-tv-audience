import { useState } from 'react';
import CupFixtureRow from './CupFixtureRow.jsx';
import CupTieGroup from './CupTieGroup.jsx';
import { groupIntoTies, tieKeyFor } from '../lib/cupFixtures.js';

const TABS = [
  { key: 'kickoff', label: 'Kickoff' },
  { key: 'result', label: 'Result' },
  { key: 'addedTime', label: 'Added time' },
  { key: 'audience', label: 'Audience' },
  { key: 'all', label: 'All' },
];

// One shared editMode tab row per round, controlling every fixture (and both
// legs of a tie) in it at once - same position and split as Serie A's
// MatchdayGroup, rather than each row managing its own separate open/closed
// tab like before.
export default function CupRoundGroup({ round, fixtures, onUpdate, onDelete, canEdit, broadcasters }) {
  const [activeTab, setActiveTab] = useState(null);

  return (
    <div className="overflow-hidden rounded-2xl shadow-lg shadow-black/20">
      <div className="flex flex-col gap-2 bg-[#0f1e54] px-3 py-2">
        <div className="text-xs font-bold uppercase tracking-wide text-white/70">{round}</div>
        {canEdit && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab((cur) => (cur === t.key ? null : t.key))}
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  activeTab === t.key ? 'bg-white text-[#0f1e54]' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col divide-y divide-gray-100">
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
    </div>
  );
}
