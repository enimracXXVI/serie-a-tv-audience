import { useState } from 'react';
import Crest from './Crest.jsx';

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-[#0f1e54] outline-none focus:border-[#1fd8c9]';

function formatDateShort(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
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

// leftScore/rightScore mean whatever's shown in the home/away display
// columns, not "our"/"their" - those get resolved by the caller from
// homeAway, since "our" club isn't always on the left.
function ScoreDisplay({ leftScore, rightScore }) {
  const played = leftScore !== null && leftScore !== undefined && rightScore !== null && rightScore !== undefined;
  return (
    <div className="flex items-center gap-1 text-sm font-bold text-[#0f1e54]">
      <span className="w-6 text-center">{played ? leftScore : '-'}</span>
      <span className="text-gray-300 text-xs">-</span>
      <span className="w-6 text-center">{played ? rightScore : '-'}</span>
    </div>
  );
}

function DetailsFields({ fixture, onUpdate }) {
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
      <Field label="Venue">
        <select
          value={fixture.homeAway ?? 'home'}
          className={`${inputClass} w-28`}
          onChange={(e) => onUpdate(fixture.id, { homeAway: e.target.value })}
        >
          <option value="home">Home</option>
          <option value="away">Away</option>
          <option value="neutral">Neutral</option>
        </select>
      </Field>
    </div>
  );
}

function ResultFields({ fixture, onUpdate, broadcasters }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <NumberField label="Our score" value={fixture.ourScore} onCommit={(v) => onUpdate(fixture.id, { ourScore: v })} />
      <NumberField label="Their score" value={fixture.theirScore} onCommit={(v) => onUpdate(fixture.id, { theirScore: v })} />
      <NumberField label="Added time 1H" value={fixture.addedTime1H} placeholder="min" onCommit={(v) => onUpdate(fixture.id, { addedTime1H: v })} />
      <NumberField label="Added time 2H" value={fixture.addedTime2H} placeholder="min" onCommit={(v) => onUpdate(fixture.id, { addedTime2H: v })} />
      <NumberField label="Audience" value={fixture.audience} placeholder="viewers" onCommit={(v) => onUpdate(fixture.id, { audience: v })} />
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
    </div>
  );
}

export default function CupFixtureRow({ fixture, onUpdate, canEdit, broadcasters }) {
  const [activeTab, setActiveTab] = useState(null);
  const dateShort = formatDateShort(fixture.date);
  const broadcaster = broadcasters.find((b) => b.name === fixture.broadcaster);
  const isHome = fixture.homeAway !== 'away';
  const leftScore = isHome ? fixture.ourScore : fixture.theirScore;
  const rightScore = isHome ? fixture.theirScore : fixture.ourScore;

  return (
    <div className="flex items-stretch bg-white">
      <div className="min-w-0 flex-1 px-2 py-2 sm:px-3 sm:py-2.5">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center text-center text-[9px] leading-tight text-gray-400">
            {dateShort && <div>{dateShort}</div>}
            {fixture.kickoffTime && <div>{fixture.kickoffTime}</div>}
            {fixture.homeAway === 'neutral' && <div className="font-black text-gray-400">N</div>}
          </div>

          <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-2 min-w-0">
            <div className="flex items-center justify-end gap-1.5 min-w-0 sm:gap-2">
              <span className="truncate text-xs sm:text-sm text-right text-gray-700">
                {fixture.home.short ?? fixture.home.name}
              </span>
              <Crest team={fixture.home} size={24} />
            </div>

            <div className="rounded-md px-1 py-1">
              <ScoreDisplay leftScore={leftScore} rightScore={rightScore} />
            </div>

            <div className="flex items-center gap-1.5 min-w-0 sm:gap-2">
              <Crest team={fixture.away} size={24} />
              <span className="truncate text-xs sm:text-sm text-gray-700">{fixture.away.short ?? fixture.away.name}</span>
            </div>
          </div>

          <div className="flex w-16 shrink-0 items-center justify-end gap-1">
            {broadcaster?.logoUrl && <img src={broadcaster.logoUrl} alt={broadcaster.name} className="h-3.5 max-w-full object-contain" />}
          </div>
        </div>

        {canEdit && (
          <div className="mt-1.5 flex gap-1">
            {['details', 'result'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab((t) => (t === tab ? null : tab))}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  activeTab === tab ? 'bg-[#0f1e54] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {tab === 'details' ? 'Kickoff' : 'Result & audience'}
              </button>
            ))}
          </div>
        )}

        {canEdit && activeTab && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg bg-gray-50 p-2.5">
            {activeTab === 'details' && <DetailsFields fixture={fixture} onUpdate={onUpdate} />}
            {activeTab === 'result' && <ResultFields fixture={fixture} onUpdate={onUpdate} broadcasters={broadcasters} />}
          </div>
        )}
      </div>
    </div>
  );
}
