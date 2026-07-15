import { useState } from 'react';
import Crest from './Crest.jsx';

function AudienceInput({ value, placeholder, onCommit, accent }) {
  const [draft, setDraft] = useState(value ?? '');

  return (
    <input
      type="number"
      step="0.01"
      min="0"
      inputMode="decimal"
      className="score-input w-16 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-1 text-center text-xs text-white/90 outline-none transition-colors focus:border-white/40 placeholder:text-white/25"
      style={{ '--tw-ring-color': accent }}
      placeholder={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const num = draft === '' ? null : Number(draft);
        if (num !== (value ?? null)) onCommit(num);
      }}
    />
  );
}

function ScoreInput({ value, onCommit }) {
  const [draft, setDraft] = useState(value ?? '');
  return (
    <input
      type="number"
      min="0"
      max="20"
      className="score-input h-7 w-8 rounded-md border border-white/15 bg-white/[0.06] text-center text-sm font-bold text-white outline-none focus:border-white/50"
      placeholder="-"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const num = draft === '' ? null : Number(draft);
        if (num !== (value ?? null)) onCommit(num);
      }}
    />
  );
}

export default function FixtureRow({ fixture, onUpdate, highlightSlugs = [] }) {
  const { home, away } = fixture;
  const homeHighlighted = highlightSlugs.includes(home.slug);
  const awayHighlighted = highlightSlugs.includes(away.slug);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center justify-end gap-2 min-w-0">
        <span
          className={`truncate text-sm text-right ${homeHighlighted ? 'font-bold text-white' : 'text-white/80'}`}
        >
          {home.name}
        </span>
        <Crest team={home} size={26} />
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <ScoreInput value={fixture.homeScore} onCommit={(v) => onUpdate(fixture.id, { homeScore: v })} />
          <span className="text-white/30 text-xs">-</span>
          <ScoreInput value={fixture.awayScore} onCommit={(v) => onUpdate(fixture.id, { awayScore: v })} />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <div className="flex items-center gap-1">
            <span className="rounded bg-emerald-500/20 px-1 py-0.5 font-semibold text-emerald-300">DAZN</span>
            <AudienceInput
              value={fixture.daznAudience}
              placeholder="M"
              accent={home.primary}
              onCommit={(v) => onUpdate(fixture.id, { daznAudience: v })}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded bg-sky-500/20 px-1 py-0.5 font-semibold text-sky-300">Sky</span>
            <AudienceInput
              value={fixture.skyAudience}
              placeholder="M"
              accent={home.primary}
              onCommit={(v) => onUpdate(fixture.id, { skyAudience: v })}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <Crest team={away} size={26} />
        <span
          className={`truncate text-sm ${awayHighlighted ? 'font-bold text-white' : 'text-white/80'}`}
        >
          {away.name}
        </span>
      </div>
    </div>
  );
}
