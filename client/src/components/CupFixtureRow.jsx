import { useState } from 'react';
import Crest from './Crest.jsx';
import ToggleSwitch from './ToggleSwitch.jsx';
import { BroadcasterBadge } from './BroadcastBadges.jsx';
import { resolveCupFixtureOutcome } from '../lib/cupFixtures.js';
import { resolveBroadcasterList } from '../lib/broadcasters.js';
import { hasLedDeal, hasLedMinutesConcept } from '../lib/teams.js';
import { isCoppaItalia } from '../lib/competitions.js';
import { useConfirm } from '../lib/useConfirm.jsx';

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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-amber-500" aria-hidden="true">
      <path d="M7 4h10v4.2a5 5 0 0 1-4 4.9V16h2.5a1.3 1.3 0 0 1 0 2.6h-7A1.3 1.3 0 0 1 8.5 16H11v-2.9a5 5 0 0 1-4-4.9V4Z" />
      <path d="M5 5H3v2.2A3.8 3.8 0 0 0 6 11a7 7 0 0 1-1-4.8V5Z" />
      <path d="M19 5h2v2.2A3.8 3.8 0 0 1 18 11a7 7 0 0 0 1-4.8V5Z" />
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
      <div className="flex items-center gap-0.5 text-sm font-bold text-[#0f1e54] sm:gap-1">
        <span className="w-4 text-center sm:w-6">{played ? homeScore : '-'}</span>
        <span className="text-gray-300 text-xs">-</span>
        <span className="w-4 text-center sm:w-6">{played ? awayScore : '-'}</span>
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
          value={fixture.otherBroadcaster ?? ''}
          className={`${inputClass} w-40`}
          onChange={(e) => onUpdate(fixture.id, { otherBroadcaster: e.target.value || null })}
        >
          <option value="">None</option>
          {broadcasters.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <ToggleSwitch
        checked={Boolean(fixture.neutralVenue)}
        onChange={(v) => onUpdate(fixture.id, { neutralVenue: v })}
        label="Neutral venue"
        labelClassName="text-gray-400"
      />
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

// LED perimeter-board tracking extends to Coppa Italia (unlike the other
// cups) up to the semifinals - the final is excluded because it's played at
// a neutral venue, where the "home" club doesn't actually own the ground its
// perimeter boards would be on. `neutralVenue` already captures exactly that
// distinction, so this gates on it directly rather than matching round text.
function cupFixtureHasLed(fixture) {
  return isCoppaItalia(fixture.competition) && !fixture.neutralVenue;
}

function LedFields({ fixture, onUpdate }) {
  const { home } = fixture;
  if (!hasLedDeal(home)) {
    return <p className="text-xs text-gray-400">No LED deal for {home.name} this season.</p>;
  }
  if (!hasLedMinutesConcept(home)) {
    return <p className="text-xs text-gray-400">{home.name} has goal carpet branding this season - no per-fixture LED minutes to track.</p>;
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      <NumberField
        label="Extra LED minutes"
        value={fixture.extraLedMinutes}
        placeholder="min"
        onCommit={(v) => onUpdate(fixture.id, { extraLedMinutes: v })}
      />
      {home.penaltyLed && (
        <ToggleSwitch
          checked={Boolean(fixture.penaltyTaken)}
          onChange={(v) => onUpdate(fixture.id, { penaltyTaken: v })}
          label="Penalty taken"
          labelClassName="text-gray-400"
        />
      )}
    </div>
  );
}

export default function CupFixtureRow({ fixture, onUpdate, onDelete, canEdit, editMode, broadcasters, legLabel }) {
  const dateShort = formatDateShort(fixture.date);
  const broadcasterList = resolveBroadcasterList(fixture.otherBroadcaster, broadcasters);
  const outcome = resolveCupFixtureOutcome(fixture);
  const scoreNote = outcome.wentToPens
    ? `pens ${outcome.penHomeScore}-${outcome.penAwayScore}`
    : outcome.wentToEt
      ? 'AET'
      : null;
  const winnerSlug = isFinalRound(fixture.round) ? finalWinnerSlug(fixture, outcome) : null;
  const [confirm, confirmDialog] = useConfirm();

  async function handleDelete() {
    if (
      !(await confirm(`Delete this fixture (${fixture.home.name} vs ${fixture.away.name})? This can't be undone from here.`))
    ) {
      return;
    }
    onDelete(fixture.id);
  }

  return (
    <div className="flex items-stretch bg-white">
      {confirmDialog}
      <div className="min-w-0 flex-1 px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex h-11 w-14 shrink-0 flex-col items-center justify-center text-center text-[9px] leading-tight text-gray-400">
            {dateShort && <div>{dateShort}</div>}
            {(fixture.day || fixture.kickoffTime) && (
              <div>{[fixture.day, fixture.kickoffTime].filter(Boolean).join(' ')}</div>
            )}
            {fixture.neutralVenue && <div className="font-black text-gray-400">N</div>}
          </div>

          <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-2 min-w-0">
            <div className="flex items-center justify-end gap-1 min-w-0 sm:gap-2">
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

            <div className="flex flex-col items-center rounded-md px-0.5 py-1 sm:px-1">
              {legLabel && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{legLabel}</span>
              )}
              <ScoreDisplay homeScore={outcome.homeScore} awayScore={outcome.awayScore} note={scoreNote} />
            </div>

            <div className="flex items-center gap-1 min-w-0 sm:gap-2">
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

          <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden">
            {broadcasterList.map(({ broadcaster, fallbackName }, i) => (
              <BroadcasterBadge
                key={`${fallbackName}-${i}`}
                broadcaster={broadcaster}
                fallbackName={fallbackName}
                className="h-3 w-full"
              />
            ))}
          </div>
        </div>

        {canEdit && editMode && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg bg-gray-50 p-2.5">
            {editMode === 'kickoff' && <KickoffFields fixture={fixture} onUpdate={onUpdate} broadcasters={broadcasters} />}
            {editMode === 'result' && <ResultFields fixture={fixture} onUpdate={onUpdate} />}
            {editMode === 'addedTime' && <AddedTimeFields fixture={fixture} onUpdate={onUpdate} />}
            {editMode === 'audience' && <AudienceFields fixture={fixture} onUpdate={onUpdate} />}
            {editMode === 'led' && cupFixtureHasLed(fixture) && <LedFields fixture={fixture} onUpdate={onUpdate} />}
            {editMode === 'led' && !cupFixtureHasLed(fixture) && (
              <p className="text-xs text-gray-400">LED tracking only applies to Coppa Italia, up to the semifinals.</p>
            )}
            {editMode === 'all' && (
              <>
                <KickoffFields fixture={fixture} onUpdate={onUpdate} broadcasters={broadcasters} />
                <ResultFields fixture={fixture} onUpdate={onUpdate} />
                <AddedTimeFields fixture={fixture} onUpdate={onUpdate} />
                <AudienceFields fixture={fixture} onUpdate={onUpdate} />
                {cupFixtureHasLed(fixture) && <LedFields fixture={fixture} onUpdate={onUpdate} />}
              </>
            )}
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
