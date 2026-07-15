import { useState } from 'react';
import Crest from './Crest.jsx';

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-[#0f1e54] outline-none focus:border-[#1fd8c9]';

function formatDateShort(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function DaznBadge() {
  return <span className="rounded bg-black px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white">DAZN</span>;
}

function SkyBadge() {
  return (
    <span className="rounded bg-gradient-to-r from-[#0a1440] to-[#0072ff] px-1.5 py-0.5 text-[9px] font-black italic tracking-wide text-white">
      sky
    </span>
  );
}

function ScoreDisplay({ homeScore, awayScore }) {
  const played = homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined;
  return (
    <div className="flex items-center gap-1.5 text-sm font-bold text-[#0f1e54]">
      <span className="w-8 text-center">{played ? homeScore : '-'}</span>
      <span className="text-gray-300 text-xs">-</span>
      <span className="w-8 text-center">{played ? awayScore : '-'}</span>
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

export default function FixtureRow({ fixture, onUpdate, highlightSlugs = [], canEdit, onRequireSignIn }) {
  const { home, away } = fixture;
  const [expanded, setExpanded] = useState(false);
  const homeHighlighted = highlightSlugs.includes(home.slug);
  const awayHighlighted = highlightSlugs.includes(away.slug);
  const metaText = [formatDateShort(fixture.date), fixture.kickoffTime].filter(Boolean).join(' · ');

  function handleSummaryClick() {
    if (!canEdit) {
      onRequireSignIn();
      return;
    }
    setExpanded((e) => !e);
  }

  return (
    <div className="px-3 py-2.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center justify-end gap-2 min-w-0">
          <span
            className={`truncate text-sm text-right ${homeHighlighted ? 'font-bold text-[#0f1e54]' : 'text-gray-700'}`}
          >
            {home.name}
          </span>
          <Crest team={home} size={26} />
        </div>

        <button
          onClick={handleSummaryClick}
          className="rounded-md px-1 py-1 transition-colors hover:bg-gray-100"
          title={canEdit ? 'Edit match details' : 'Sign in to edit'}
        >
          <ScoreDisplay homeScore={fixture.homeScore} awayScore={fixture.awayScore} />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <Crest team={away} size={26} />
          <span className={`truncate text-sm ${awayHighlighted ? 'font-bold text-[#0f1e54]' : 'text-gray-700'}`}>
            {away.name}
          </span>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
        {metaText && <span className="mr-0.5">{metaText}</span>}
        <DaznBadge />
        {fixture.onSky && <SkyBadge />}
      </div>

      {expanded && canEdit && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-4">
          <Field label="Date">
            <input
              type="date"
              defaultValue={fixture.date ?? ''}
              className={inputClass}
              onBlur={(e) => {
                if (e.target.value !== (fixture.date ?? '')) onUpdate(fixture.id, { date: e.target.value || null });
              }}
            />
          </Field>
          <Field label="Kickoff time">
            <input
              type="time"
              defaultValue={fixture.kickoffTime ?? ''}
              className={inputClass}
              onBlur={(e) => {
                if (e.target.value !== (fixture.kickoffTime ?? ''))
                  onUpdate(fixture.id, { kickoffTime: e.target.value || null });
              }}
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
            placeholder="M"
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
