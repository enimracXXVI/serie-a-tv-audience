import { useState } from 'react';
import Crest from './Crest.jsx';
import { BroadcasterBadge } from './BroadcastBadges.jsx';
import SponsorBadges from './SponsorBadges.jsx';
import { matchTagStyle } from '../lib/matchTags.js';
import { SPONSOR_TYPES } from '../lib/sponsorCounts.js';
import { useCupData } from '../lib/useCupData.jsx';

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
            <option key={b.name} value={b.name}>
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
        value={fixture.daznAudience}
        placeholder="M"
        onCommit={(v) => onUpdate(fixture.id, { daznAudience: v })}
      />
      {fixture.otherBroadcaster && (
        <NumberField
          label="Other broadcaster audience"
          value={fixture.skyAudience}
          placeholder="M"
          onCommit={(v) => onUpdate(fixture.id, { skyAudience: v })}
        />
      )}
      {fixture.isFirstInBlock && (
        <NumberField
          label={`${mainBroadcasterName} simulcast audience`}
          value={fixture.daznSimulcastAudience}
          placeholder="M · shared slot"
          onCommit={(v) => onUpdate(fixture.id, { daznSimulcastAudience: v })}
        />
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
                <label
                  key={fixtureKey}
                  className={`flex items-center gap-1.5 ${capReached ? 'opacity-40' : ''}`}
                  title={capReached ? `${label} cap reached (${current}/${cap}) - raise it in Settings to allow more.` : undefined}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={capReached}
                    onChange={(e) => onUpdate(fixture.id, { [fieldName]: e.target.checked })}
                    className="h-4 w-4 accent-[#1fd8c9] disabled:cursor-not-allowed"
                  />
                  <span className="text-xs font-semibold text-gray-600">{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FixtureRow({ fixture, onUpdate, highlightSlugs = [], canEdit, editMode, sponsorCounts }) {
  const { home, away } = fixture;
  const homeHighlighted = highlightSlugs.includes(home.slug);
  const awayHighlighted = highlightSlugs.includes(away.slug);
  const dateShort = formatDateShort(fixture.date);
  const tagStyle = matchTagStyle(fixture);

  const { broadcasters } = useCupData();
  const mainBroadcaster = broadcasters.find((b) => b.isMain) ?? null;
  const mainBroadcasterName = mainBroadcaster?.name || 'Main broadcaster';
  const otherBroadcasterOptions = broadcasters.filter((b) => !b.isMain);
  const otherBroadcasterRow = fixture.otherBroadcaster
    ? broadcasters.find((b) => b.name === fixture.otherBroadcaster)
    : null;

  return (
    <div className="flex items-stretch" style={{ background: tagStyle.background }}>
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
          <div className="flex items-center justify-end gap-1.5 min-w-0 sm:gap-2">
            <SponsorBadges
              matchdaySponsor={fixture.homeMatchdaySponsor}
              playerMascot={fixture.homePlayerMascot}
              walkabout={fixture.homeWalkabout}
            />
            <span
              className={`truncate text-xs sm:text-sm text-right ${homeHighlighted ? 'font-bold text-[#0f1e54]' : 'text-gray-700'}`}
            >
              <span className="sm:hidden">{home.short ?? home.name}</span>
              <span className="hidden sm:inline">{home.name}</span>
            </span>
            <Crest team={home} size={20} />
          </div>

          <div className="rounded-md px-1 py-1">
            <ScoreDisplay homeScore={fixture.homeScore} awayScore={fixture.awayScore} />
          </div>

          <div className="flex items-center gap-1.5 min-w-0 sm:gap-2">
            <Crest team={away} size={20} />
            <span className={`truncate text-xs sm:text-sm ${awayHighlighted ? 'font-bold text-[#0f1e54]' : 'text-gray-700'}`}>
              <span className="sm:hidden">{away.short ?? away.name}</span>
              <span className="hidden sm:inline">{away.name}</span>
            </span>
            <SponsorBadges
              matchdaySponsor={fixture.awayMatchdaySponsor}
              playerMascot={fixture.awayPlayerMascot}
              walkabout={fixture.awayWalkabout}
            />
          </div>
        </div>

        {/* Also fixed-width regardless of whether another broadcaster is
            present, so this never shifts the center block between rows. */}
        <div className="flex w-12 shrink-0 items-center gap-1 sm:w-24 sm:gap-2">
          <BroadcasterBadge broadcaster={mainBroadcaster} fallbackName={mainBroadcasterName} className="h-3.5" />
          {fixture.otherBroadcaster && (
            <BroadcasterBadge broadcaster={otherBroadcasterRow} fallbackName={fixture.otherBroadcaster} className="h-3" />
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
          {editMode === 'all' && (
            <>
              <KickoffFields fixture={fixture} onUpdate={onUpdate} otherBroadcasterOptions={otherBroadcasterOptions} />
              <ResultFields fixture={fixture} onUpdate={onUpdate} />
              <AddedTimeFields fixture={fixture} onUpdate={onUpdate} />
              <AudienceFields fixture={fixture} onUpdate={onUpdate} mainBroadcasterName={mainBroadcasterName} />
              <SponsorshipFields fixture={fixture} onUpdate={onUpdate} sponsorCounts={sponsorCounts} />
            </>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
