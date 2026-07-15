import { useState } from 'react';
import Crest from './Crest.jsx';
import { DaznLogo, SkyLogo } from './BroadcastBadges.jsx';

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-[#0f1e54] outline-none focus:border-[#1fd8c9]';

function formatDateShort(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function ScoreDisplay({ homeScore, awayScore }) {
  const played = homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined;
  return (
    <div className="flex items-center gap-1 text-sm font-bold text-[#0f1e54]">
      <span className="w-6 text-center">{played ? homeScore : '-'}</span>
      <span className="text-gray-300 text-xs">-</span>
      <span className="w-6 text-center">{played ? awayScore : '-'}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function NumberField({ label, value, onCommit, placeholder = '' }) {
  const [draft, setDraft] = useState(value ?? '');
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        className={inputClass}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const num = draft === '' ? null : Number(draft);
          if (num !== (value ?? null)) onCommit(num);
        }}
      />
    </Field>
  );
}

export default function FixtureRow({ fixture, onUpdate, highlightSlugs = [], canEdit }) {
  const { home, away } = fixture;
  const [expanded, setExpanded] = useState(false);
  const homeHighlighted = highlightSlugs.includes(home.slug);
  const awayHighlighted = highlightSlugs.includes(away.slug);
  const dateShort = formatDateShort(fixture.date);

  function handleSummaryClick() {
    if (!canEdit) return;
    setExpanded((e) => !e);
  }

  return (
    <div className="px-2 py-2 sm:px-3 sm:py-2.5">
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Fixed-width so it never affects where home/score/away land */}
        <div className="w-10 shrink-0 text-center text-[9px] leading-tight text-gray-400 sm:w-14 sm:text-[10px]">
          {dateShort && <div>{dateShort}</div>}
          {fixture.kickoffTime && <div>{fixture.kickoffTime}</div>}
        </div>

        <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-2 min-w-0">
          <div className="flex items-center justify-end gap-1.5 min-w-0 sm:gap-2">
            <span
              className={`truncate text-xs sm:text-sm text-right ${homeHighlighted ? 'font-bold text-[#0f1e54]' : 'text-gray-700'}`}
            >
              <span className="sm:hidden">{home.short ?? home.name}</span>
              <span className="hidden sm:inline">{home.name}</span>
            </span>
            <Crest team={home} size={24} />
          </div>

          <button
            onClick={handleSummaryClick}
            className={`rounded-md px-1 py-1 transition-colors ${canEdit ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}`}
            title={canEdit ? 'Edit match details' : undefined}
          >
            <ScoreDisplay homeScore={fixture.homeScore} awayScore={fixture.awayScore} />
          </button>

          <div className="flex items-center gap-1.5 min-w-0 sm:gap-2">
            <Crest team={away} size={24} />
            <span className={`truncate text-xs sm:text-sm ${awayHighlighted ? 'font-bold text-[#0f1e54]' : 'text-gray-700'}`}>
              <span className="sm:hidden">{away.short ?? away.name}</span>
              <span className="hidden sm:inline">{away.name}</span>
            </span>
          </div>
        </div>

        {/* Also fixed-width regardless of whether Sky is present, so this
            never shifts the center block between rows. Stacks on mobile
            since Sky's logo is inherently wide (~4:1 aspect ratio). */}
        <div className="flex w-12 shrink-0 flex-col items-start gap-1 sm:w-24 sm:flex-row sm:items-center sm:gap-2">
          <DaznLogo height={14} />
          {fixture.onSky && <SkyLogo height={12} />}
        </div>
      </div>

      {expanded && canEdit && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-4">
          <Field label="Date">
            <input
              type="date"
              value={fixture.date ?? ''}
              className={inputClass}
              onChange={(e) => onUpdate(fixture.id, { date: e.target.value || null })}
            />
          </Field>
          <Field label="Kickoff time">
            <input
              type="time"
              value={fixture.kickoffTime ?? ''}
              className={inputClass}
              onChange={(e) => onUpdate(fixture.id, { kickoffTime: e.target.value || null })}
            />
          </Field>
          <NumberField
            label="Home score"
            value={fixture.homeScore}
            onCommit={(v) => onUpdate(fixture.id, { homeScore: v })}
          />
          <NumberField
            label="Away score"
            value={fixture.awayScore}
            onCommit={(v) => onUpdate(fixture.id, { awayScore: v })}
          />
          <NumberField
            label="Added time 1H"
            value={fixture.addedTime1H}
            placeholder="min"
            onCommit={(v) => onUpdate(fixture.id, { addedTime1H: v })}
          />
          <NumberField
            label="Added time 2H"
            value={fixture.addedTime2H}
            placeholder="min"
            onCommit={(v) => onUpdate(fixture.id, { addedTime2H: v })}
          />
          <NumberField
            label="DAZN audience"
            value={fixture.daznAudience}
            placeholder="M"
            onCommit={(v) => onUpdate(fixture.id, { daznAudience: v })}
          />
          <NumberField
            label="DAZN simulcast audience"
            value={fixture.daznSimulcastAudience}
            placeholder="M · enter once per shared slot"
            onCommit={(v) => onUpdate(fixture.id, { daznSimulcastAudience: v })}
          />
          <label className="flex items-center gap-2 self-end pb-1.5">
            <input
              type="checkbox"
              checked={Boolean(fixture.onSky)}
              onChange={(e) => onUpdate(fixture.id, { onSky: e.target.checked })}
              className="h-4 w-4 accent-[#1fd8c9]"
            />
            <span className="text-xs font-semibold text-gray-600">Also on Sky</span>
          </label>
          {fixture.onSky && (
            <NumberField
              label="Sky audience"
              value={fixture.skyAudience}
              placeholder="M"
              onCommit={(v) => onUpdate(fixture.id, { skyAudience: v })}
            />
          )}
        </div>
      )}
    </div>
  );
}
