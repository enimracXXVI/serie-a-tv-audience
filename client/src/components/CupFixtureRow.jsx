import { useState } from 'react';
import Crest from './Crest.jsx';
import { resolveCupFixtureOutcome } from '../lib/cupFixtures.js';

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-[#0f1e54] outline-none focus:border-[#1fd8c9]';

function formatDateShort(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

// Semi-final/quarter-final rounds also contain the word "final" - only the
// last-round-of-all should get the winner highlight below.
function isFinalRound(round) {
  if (!round) return false;
  const lower = round.toLowerCase();
  return /\bfinal\b/.test(lower) && !/(semi|quarter)[\s-]?final/.test(lower);
}

// Single-leg winner (a final is never a two-legged tie) - null while
// undecided (unplayed, or level with no shootout recorded yet).
function finalWinnerSlug(fixture, outcome) {
  if (outcome.homeScore === null || outcome.homeScore === undefined) return null;
  if (outcome.awayScore === null || outcome.awayScore === undefined) return null;
  if (outcome.homeScore > outcome.awayScore) return fixture.home.slug;
  if (outcome.awayScore > outcome.homeScore) return fixture.away.slug;
  if (outcome.wentToPens) {
    if (outcome.penHomeScore > outcome.penAwayScore) return fixture.home.slug;
    if (outcome.penAwayScore > outcome.penHomeScore) return fixture.away.slug;
  }
  return null;
}

function TrophyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0 text-amber-500" aria-hidden="true">
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 5H5a3 3 0 0 0 3 5M16 5h3a3 3 0 0 1-3 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M12 12v3M9 19h6M10 19v-2.5a2 2 0 0 1 4 0V19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
        className={`${inputClass} w-24`}
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

// note is an optional small caption underneath (AET, penalty shootout result).
function ScoreDisplay({ homeScore, awayScore, note }) {
  const played = homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined;
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1 text-sm font-bold text-[#0f1e54]">
        <span className="w-6 text-center">{played ? homeScore : '-'}</span>
        <span className="text-gray-300 text-xs">-</span>
        <span className="w-6 text-center">{played ? awayScore : '-'}</span>
      </div>
      {note && <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">{note}</span>}
    </div>
  );
}

// Field grouping mirrors Serie A's FixtureRow tabs (Kickoff / Result / Added
// time / Audience) so the two fixture types feel like the same app - see
// CupRoundGroup for where these tabs are actually rendered (round header,
// same position as MatchdayGroup's tab row).
function KickoffFields({ fixture, onUpdate, broadcasters }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="Date">
        <input
          type="date"
          value={fixture.date ?? ''}
          className={`${inputClass} w-36`}
          onChange={(e) => onUpdate(fixture.id, { date: e.target.value || null })}
        />
      </Field>
      <Field label="Kickoff time">
        <input
          type="time"
          value={fixture.kickoffTime ?? ''}
          className={`${inputClass} w-28`}
          onChange={(e) => onUpdate(fixture.id, { kickoffTime: e.target.value || null })}
        />
      </Field>
      <Field label="Broadcaster">
        <select
          value={fixture.broadcaster ?? ''}
          className={`${inputClass} w-40`}
          onChange={(e) => onUpdate(fixture.id, { broadcaster: e.target.value || null })}
        >
          <option value="">None</option>
          {broadcasters.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 pb-1.5">
        <input
          type="checkbox"
          checked={Boolean(fixture.neutralVenue)}
          onChange={(e) => onUpdate(fixture.id, { neutralVenue: e.target.checked })}
          className="h-4 w-4 accent-[#1fd8c9]"
        />
        <span className="text-xs font-semibold text-gray-600">Neutral venue</span>
      </label>
    </div>
  );
}

function ResultFields({ fixture, onUpdate }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <NumberField label="Home score" value={fixture.homeScore} onCommit={(v) => onUpdate(fixture.id, { homeScore: v })} />
      <NumberField label="Away score" value={fixture.awayScore} onCommit={(v) => onUpdate(fixture.id, { awayScore: v })} />
      <NumberField
        label="ET score (home)"
        value={fixture.etHomeScore}
        placeholder="if extra time"
        onCommit={(v) => onUpdate(fixture.id, { etHomeScore: v })}
      />
      <NumberField
        label="ET score (away)"
        value={fixture.etAwayScore}
        placeholder="if extra time"
        onCommit={(v) => onUpdate(fixture.id, { etAwayScore: v })}
      />
      <NumberField
        label="Pens (home)"
        value={fixture.penHomeScore}
        placeholder="if shootout"
        onCommit={(v) => onUpdate(fixture.id, { penHomeScore: v })}
      />
      <NumberField
        label="Pens (away)"
        value={fixture.penAwayScore}
        placeholder="if shootout"
        onCommit={(v) => onUpdate(fixture.id, { penAwayScore: v })}
      />
    </div>
  );
}

function AddedTimeFields({ fixture, onUpdate }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
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
    </div>
  );
}

function AudienceFields({ fixture, onUpdate }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <NumberField label="Audience" value={fixture.audience} placeholder="viewers" onCommit={(v) => onUpdate(fixture.id, { audience: v })} />
    </div>
  );
}

export default function CupFixtureRow({ fixture, onUpdate, onDelete, canEdit, editMode, broadcasters }) {
  const dateShort = formatDateShort(fixture.date);
  const broadcaster = broadcasters.find((b) => b.name === fixture.broadcaster);
  const outcome = resolveCupFixtureOutcome(fixture);
  const scoreNote = outcome.wentToPens
    ? `pens ${outcome.penHomeScore}-${outcome.penAwayScore}`
    : outcome.wentToEt
      ? 'AET'
      : null;
  const winnerSlug = isFinalRound(fixture.round) ? finalWinnerSlug(fixture, outcome) : null;

  function handleDelete() {
    if (
      !window.confirm(`Delete this fixture (${fixture.home.name} vs ${fixture.away.name})? This can't be undone from here.`)
    ) {
      return;
    }
    onDelete(fixture.id);
  }

  return (
    <div className="flex items-stretch bg-white">
      <div className="min-w-0 flex-1 px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex h-11 w-14 shrink-0 flex-col items-center justify-center text-center text-[9px] leading-tight text-gray-400">
            {dateShort && <div>{dateShort}</div>}
            {fixture.kickoffTime && <div>{fixture.kickoffTime}</div>}
            {fixture.neutralVenue && <div className="font-black text-gray-400">N</div>}
          </div>

          <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-2 min-w-0">
            <div className="flex items-center justify-end gap-1.5 min-w-0 sm:gap-2">
              {winnerSlug === fixture.home.slug && <TrophyIcon />}
              {fixture.home.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
              <span
                className={`truncate text-xs sm:text-sm text-right ${fixture.home.sponsored ? 'font-bold text-[#0f1e54]' : 'text-gray-700'}`}
              >
                <span className="sm:hidden">{fixture.home.short ?? fixture.home.name}</span>
                <span className="hidden sm:inline">{fixture.home.name}</span>
              </span>
              <Crest team={fixture.home} size={20} />
            </div>

            <div className="rounded-md px-1 py-1">
              <ScoreDisplay homeScore={outcome.homeScore} awayScore={outcome.awayScore} note={scoreNote} />
            </div>

            <div className="flex items-center gap-1.5 min-w-0 sm:gap-2">
              <Crest team={fixture.away} size={20} />
              <span
                className={`truncate text-xs sm:text-sm ${fixture.away.sponsored ? 'font-bold text-[#0f1e54]' : 'text-gray-700'}`}
              >
                <span className="sm:hidden">{fixture.away.short ?? fixture.away.name}</span>
                <span className="hidden sm:inline">{fixture.away.name}</span>
              </span>
              {fixture.away.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
              {winnerSlug === fixture.away.slug && <TrophyIcon />}
            </div>
          </div>

          <div className="flex w-16 shrink-0 items-center justify-end gap-1 overflow-hidden">
            {broadcaster?.logoUrl && <img src={broadcaster.logoUrl} alt={broadcaster.name} className="h-3.5 max-w-full object-contain" />}
          </div>
        </div>

        {canEdit && editMode && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg bg-gray-50 p-2.5">
            {editMode === 'kickoff' && <KickoffFields fixture={fixture} onUpdate={onUpdate} broadcasters={broadcasters} />}
            {editMode === 'result' && <ResultFields fixture={fixture} onUpdate={onUpdate} />}
            {editMode === 'addedTime' && <AddedTimeFields fixture={fixture} onUpdate={onUpdate} />}
            {editMode === 'audience' && <AudienceFields fixture={fixture} onUpdate={onUpdate} />}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="w-fit rounded-md border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
              >
                Delete fixture
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
