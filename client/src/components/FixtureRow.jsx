import { useState } from 'react';
import Crest from './Crest.jsx';
import { BroadcasterBadge } from './BroadcastBadges.jsx';
import SponsorBadges from './SponsorBadges.jsx';
import { matchTagStyle } from '../lib/matchTags.js';
import { SPONSOR_TYPES } from '../lib/sponsorCounts.js';
import { useCupData } from '../lib/useCupData.jsx';
import { resolveBroadcaster } from '../lib/broadcasters.js';
import { hasLedDeal, hasLedMinutesConcept, ledMinutesApplyToFixture } from '../lib/teams.js';
import ToggleSwitch from './ToggleSwitch.jsx';
import { useConfirm } from '../lib/useConfirm.jsx';

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-[#0f1e54] outline-none focus:border-[#1fd8c9]';

function formatDateShort(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function ScoreDisplay({ homeScore, awayScore }) {
  const played = homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined;
  return (
    <div className="flex items-center gap-0.5 text-sm font-bold text-[#0f1e54] sm:gap-1">
      <span className="w-4 text-center sm:w-6">{played ? homeScore : '-'}</span>
      <span className="text-gray-300 text-xs">-</span>
      <span className="w-4 text-center sm:w-6">{played ? awayScore : '-'}</span>
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

function KickoffFields({ fixture, onUpdate, otherBroadcasterOptions }) {
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
      <Field label="Other broadcaster">
        <select
          value={fixture.otherBroadcaster ?? ''}
          className={`${inputClass} w-40`}
          onChange={(e) => onUpdate(fixture.id, { otherBroadcaster: e.target.value || null })}
        >
          <option value="">None</option>
          {otherBroadcasterOptions.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function ResultFields({ fixture, onUpdate }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <NumberField label="Home score" value={fixture.homeScore} onCommit={(v) => onUpdate(fixture.id, { homeScore: v })} />
      <NumberField label="Away score" value={fixture.awayScore} onCommit={(v) => onUpdate(fixture.id, { awayScore: v })} />
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

function AudienceFields({ fixture, onUpdate, mainBroadcasterName }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <NumberField
        label={`${mainBroadcasterName} audience`}
        value={fixture.mainAudience}
        placeholder="M"
        onCommit={(v) => onUpdate(fixture.id, { mainAudience: v })}
      />
      {fixture.otherBroadcaster && (
        <NumberField
          label="Other broadcaster audience"
          value={fixture.otherAudience}
          placeholder="M"
          onCommit={(v) => onUpdate(fixture.id, { otherAudience: v })}
        />
      )}
      {fixture.isFirstInBlock && (
        <NumberField
          label={`${mainBroadcasterName} simulcast audience`}
          value={fixture.simulcastAudience}
          placeholder="M · shared slot"
          onCommit={(v) => onUpdate(fixture.id, { simulcastAudience: v })}
        />
      )}
    </div>
  );
}

// LED perimeter-board tracking is scoped to the home club's own stadium
// (boards only exist there - see the Dashboard README section on "Home
// audience") - so this only ever looks at `fixture.home`'s season-scoped LED
// settings from teamSeasons, never `away`'s.
function LedFields({ fixture, onUpdate }) {
  const { home } = fixture;
  if (!hasLedDeal(home)) {
    return <p className="text-xs text-gray-400">No LED deal for {home.name} this season.</p>;
  }
  if (!hasLedMinutesConcept(home)) {
    // Goal-carpet-only - there's no per-fixture minutes concept to edit at
    // all (see hasLedMinutesConcept), just the season-level fact itself.
    return <p className="text-xs text-gray-400">{home.name} has goal carpet branding this season - no per-fixture LED minutes to track.</p>;
  }
  if (!ledMinutesApplyToFixture(home, fixture)) {
    return (
      <p className="text-xs text-gray-400">
        {home.name}&apos;s LED deal doesn&apos;t start until matchday {home.ledStartMatchday}.
      </p>
    );
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
        <div className="pb-1.5">
          <ToggleSwitch
            checked={Boolean(fixture.penaltyTaken)}
            onChange={(v) => onUpdate(fixture.id, { penaltyTaken: v })}
            label="Penalty taken"
            labelClassName="text-gray-600"
          />
        </div>
      )}
    </div>
  );
}

function SponsorshipFields({ fixture, onUpdate, sponsorCounts }) {
  const sides = [];
  if (fixture.home.sponsored) sides.push({ prefix: 'home', team: fixture.home });
  if (fixture.away.sponsored) sides.push({ prefix: 'away', team: fixture.away });

  if (sides.length === 0) {
    return <p className="text-xs text-gray-400">No sponsored club in this fixture.</p>;
  }

  return (
    <div className="flex flex-wrap gap-4">
      {sides.map(({ prefix, team }) => (
        <div key={prefix} className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{team.name}</span>
          <div className="flex flex-wrap gap-3">
            {SPONSOR_TYPES.map(({ fixtureKey, capField, label }) => {
              const fieldName = `${prefix}${fixtureKey}`;
              const checked = Boolean(fixture[fieldName]);
              const cap = team[capField];
              const current = sponsorCounts?.[team.slug]?.[capField] ?? 0;
              const capReached = !checked && cap !== null && cap !== undefined && cap !== '' && current >= Number(cap);
              return (
                <ToggleSwitch
                  key={fixtureKey}
                  checked={checked}
                  disabled={capReached}
                  onChange={(v) => onUpdate(fixture.id, { [fieldName]: v })}
                  label={label}
                  labelClassName="text-gray-600"
                  title={capReached ? `${label} cap reached (${current}/${cap}) - raise it in Settings to allow more.` : undefined}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FixtureRow({ fixture, onUpdate, onDelete, highlightSlugs = [], canEdit, editMode, sponsorCounts }) {
  const { home, away } = fixture;
  const homeHighlighted = highlightSlugs.includes(home.slug);
  const awayHighlighted = highlightSlugs.includes(away.slug);
  const dateShort = formatDateShort(fixture.date);
  const tagStyle = matchTagStyle(fixture);

  const { broadcasters } = useCupData();
  const mainBroadcaster = broadcasters.find((b) => b.isMain) ?? null;
  const mainBroadcasterName = mainBroadcaster?.name || 'Main broadcaster';
  const otherBroadcasterOptions = broadcasters.filter((b) => !b.isMain);
  const otherBroadcasterRow = resolveBroadcaster(fixture.otherBroadcaster, broadcasters);
  const [confirm, confirmDialog] = useConfirm();

  async function handleDelete() {
    if (!(await confirm(`Delete this fixture (${home.name} vs ${away.name})? This can't be undone from here.`))) {
      return;
    }
    onDelete(fixture.id);
  }

  return (
    <div className="flex items-stretch" style={{ background: tagStyle.background }}>
      {confirmDialog}
      <div className="w-1.5 shrink-0" style={{ background: tagStyle.bar }} />
      <div className="min-w-0 flex-1 px-2 py-1.5 sm:px-3 sm:py-2">
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Fixed width AND height so a derby/big-match label never changes
            row height - every row is the same size whether it has 0, 1 or 2
            extra labels. */}
        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center text-center text-[8px] leading-tight text-gray-400 sm:w-14 sm:text-[10px]">
          {dateShort && <div className="whitespace-nowrap">{dateShort}</div>}
          {(fixture.day || fixture.kickoffTime) && (
            <div>{[fixture.day, fixture.kickoffTime].filter(Boolean).join(' ')}</div>
          )}
          {tagStyle.labels.map((l) => (
            <div key={l.text} className={`font-black ${l.className}`}>
              {l.text}
            </div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-2 min-w-0">
          <div className="flex items-center justify-end gap-1 min-w-0 sm:gap-2">
            {/* Hidden below sm - these fixed-size badges were eating the
                narrow mobile column's whole width, squeezing the team name/
                code itself down to an ellipsis or nothing (see FixtureRow
                mobile layout notes). The name always wins the space fight on
                mobile; badges come back once there's room. */}
            <SponsorBadges
              matchdaySponsor={fixture.homeMatchdaySponsor}
              playerMascot={fixture.homePlayerMascot}
              walkabout={fixture.homeWalkabout}
              className="hidden sm:flex"
            />
            {home.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
            <span
              className={`truncate text-xs sm:text-sm text-right ${homeHighlighted || home.sponsored ? 'font-bold text-[#0f1e54]' : 'text-gray-700'}`}
            >
              <span className="sm:hidden">{home.short ?? home.name}</span>
              <span className="hidden sm:inline">{home.name}</span>
            </span>
            <Crest team={home} size={20} />
          </div>

          <div className="rounded-md px-0.5 py-1 sm:px-1">
            <ScoreDisplay homeScore={fixture.homeScore} awayScore={fixture.awayScore} />
          </div>

          <div className="flex items-center gap-1 min-w-0 sm:gap-2">
            <Crest team={away} size={20} />
            <span className={`truncate text-xs sm:text-sm ${awayHighlighted || away.sponsored ? 'font-bold text-[#0f1e54]' : 'text-gray-700'}`}>
              <span className="sm:hidden">{away.short ?? away.name}</span>
              <span className="hidden sm:inline">{away.name}</span>
            </span>
            {away.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
            <SponsorBadges
              matchdaySponsor={fixture.awayMatchdaySponsor}
              playerMascot={fixture.awayPlayerMascot}
              walkabout={fixture.awayWalkabout}
              className="hidden sm:flex"
            />
          </div>
        </div>

        {/* Also fixed-width regardless of whether another broadcaster is
            present, so this never shifts the center block between rows.
            Stacked (not side-by-side) on mobile - two wordmark logos sharing
            one row here were splitting an already-narrow column, squeezing
            the team names next to them into ellipsis even at 3 letters. Each
            logo gets `w-full` so it always shrinks to the column's actual
            width instead of pushing past it. */}
        <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden sm:w-24 sm:flex-row sm:gap-2">
          <BroadcasterBadge
            broadcaster={mainBroadcaster}
            fallbackName={mainBroadcasterName}
            className="h-3 w-full sm:h-3.5 sm:w-auto"
          />
          {fixture.otherBroadcaster && (
            <BroadcasterBadge
              broadcaster={otherBroadcasterRow}
              fallbackName={fixture.otherBroadcaster}
              className="h-2.5 w-full sm:h-3 sm:w-auto"
            />
          )}
        </div>
      </div>

      {canEdit && editMode && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg bg-gray-50 p-2.5">
          {editMode === 'kickoff' && (
            <KickoffFields fixture={fixture} onUpdate={onUpdate} otherBroadcasterOptions={otherBroadcasterOptions} />
          )}
          {editMode === 'result' && <ResultFields fixture={fixture} onUpdate={onUpdate} />}
          {editMode === 'addedTime' && <AddedTimeFields fixture={fixture} onUpdate={onUpdate} />}
          {editMode === 'audience' && (
            <AudienceFields fixture={fixture} onUpdate={onUpdate} mainBroadcasterName={mainBroadcasterName} />
          )}
          {editMode === 'sponsors' && (
            <SponsorshipFields fixture={fixture} onUpdate={onUpdate} sponsorCounts={sponsorCounts} />
          )}
          {editMode === 'led' && <LedFields fixture={fixture} onUpdate={onUpdate} />}
          {editMode === 'all' && (
            <>
              <KickoffFields fixture={fixture} onUpdate={onUpdate} otherBroadcasterOptions={otherBroadcasterOptions} />
              <ResultFields fixture={fixture} onUpdate={onUpdate} />
              <AddedTimeFields fixture={fixture} onUpdate={onUpdate} />
              <AudienceFields fixture={fixture} onUpdate={onUpdate} mainBroadcasterName={mainBroadcasterName} />
              <SponsorshipFields fixture={fixture} onUpdate={onUpdate} sponsorCounts={sponsorCounts} />
              <LedFields fixture={fixture} onUpdate={onUpdate} />
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
