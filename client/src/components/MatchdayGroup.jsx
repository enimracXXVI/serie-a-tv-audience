import { useEffect, useMemo, useState } from 'react';
import FixtureRow from './FixtureRow.jsx';

const TABS = [
  { key: 'kickoff', label: 'Kickoff' },
  { key: 'result', label: 'Result' },
  { key: 'addedTime', label: 'Added time' },
  { key: 'audience', label: 'Audience' },
  { key: 'sponsors', label: 'Sponsors' },
  { key: 'led', label: 'LED' },
  { key: 'all', label: 'All' },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function MatchdayGroup({ matchday, fixtures, onUpdate, onDelete, highlightSlugs, accent, textColor: textColorProp, canEdit, sponsorCounts, highlightFixtureId, clean }) {
  const [activeTab, setActiveTab] = useState(null);
  // Editing a date re-sorts this matchday the instant it's saved, which
  // jumps the row out from under you mid-edit - so while any tab is open the
  // row ORDER is frozen (each row's own values still update live), and only
  // re-sorts once you close the tab. Switching matchday remounts this
  // component fresh, which also releases the freeze.
  const [frozenOrder, setFrozenOrder] = useState(null);
  useEffect(() => {
    setFrozenOrder(activeTab ? (prev) => prev ?? fixtures.map((f) => f.id) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fixturesById = useMemo(() => new Map(fixtures.map((f) => [f.id, f])), [fixtures]);
  const orderedFixtures = frozenOrder ? frozenOrder.map((id) => fixturesById.get(id)).filter(Boolean) : fixtures;

  const dates = fixtures.map((f) => f.date).filter(Boolean);
  const range =
    dates.length > 0
      ? dates[0] === dates[dates.length - 1]
        ? formatDate(dates[0])
        : `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`
      : '';

  // Every card header in the app uses this exact navy for its title text
  // (see Card.jsx's TITLE_COLOR) - a computed contrast colour used to run
  // here instead, which for the default teal accent came out as a
  // near-black that didn't quite match the navy every other header uses. A
  // multi-team calendar still passes its own textColor explicitly (that
  // team's own secondary colour) since a fixed navy would ignore the team's
  // actual brand pairing there - that's the one case an inline style is
  // still needed for, an arbitrary runtime colour no static class can express.
  const textColor = textColorProp;

  return (
    <section
      id={`matchday-${matchday}`}
      className="scroll-mt-4 overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/20"
    >
      <header className="flex flex-col gap-2 px-4 py-2.5" style={{ background: accent }}>
        <div className="flex items-baseline justify-between">
          <h3
            className={`text-sm font-bold tracking-wide ${textColor ? '' : 'text-[#0f1e54]'}`}
            style={textColor ? { color: textColor } : undefined}
          >
            Matchday {matchday}
          </h3>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${textColor ? '' : 'text-[#0f1e54]/70'}`} style={textColor ? { color: textColor, opacity: 0.7 } : undefined}>
              {range}
            </span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={`text-xs font-semibold hover:opacity-100 ${textColor ? '' : 'text-[#0f1e54]/70'}`}
              style={textColor ? { color: textColor, opacity: 0.7 } : undefined}
            >
              ↑ Top
            </button>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab((cur) => (cur === t.key ? null : t.key))}
                className={`rounded-full bg-black/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors hover:bg-black/30 ${
                  activeTab === t.key ? '' : textColor ? '' : 'text-[#0f1e54]/85'
                }`}
                style={
                  activeTab === t.key
                    ? { background: 'white', color: accent }
                    : textColor
                      ? { color: textColor, opacity: 0.85 }
                      : undefined
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="flex flex-col">
        {orderedFixtures.map((f, i) => (
          <div
            key={f.id}
            id={`fixture-${f.id}`}
            style={i > 0 ? { borderTop: `1px solid ${accent}33` } : undefined}
            className={f.id === highlightFixtureId ? 'ring-2 ring-inset ring-amber-400 transition-shadow' : ''}
          >
            <FixtureRow
              fixture={f}
              onUpdate={onUpdate}
              onDelete={onDelete}
              highlightSlugs={highlightSlugs}
              canEdit={canEdit}
              editMode={activeTab}
              sponsorCounts={sponsorCounts}
              clean={clean}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
