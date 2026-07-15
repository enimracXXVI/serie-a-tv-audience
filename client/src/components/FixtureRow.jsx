import { useState } from 'react';
import Crest from './Crest.jsx';

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

function ScoreDisplay({ homeScore, awayScore }) {
  const played = homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined;
  return (
    <div className="flex items-center gap-1.5 text-sm font-bold text-white">
      <span className="w-8 text-center">{played ? homeScore : '-'}</span>
      <span className="text-white/30 text-xs">-</span>
      <span className="w-8 text-center">{played ? awayScore : '-'}</span>
    </div>
  );
}

export default function FixtureRow({ fixture, onUpdate, highlightSlugs = [], canEdit, onRequireSignIn }) {
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

      {canEdit ? (
        <div className="flex items-center gap-1.5">
          <ScoreInput value={fixture.homeScore} onCommit={(v) => onUpdate(fixture.id, { homeScore: v })} />
          <span className="text-white/30 text-xs">-</span>
          <ScoreInput value={fixture.awayScore} onCommit={(v) => onUpdate(fixture.id, { awayScore: v })} />
        </div>
      ) : (
        <button
          onClick={onRequireSignIn}
          title="Sign in to edit"
          className="rounded-md px-1 py-1 transition-colors hover:bg-white/[0.06]"
        >
          <ScoreDisplay homeScore={fixture.homeScore} awayScore={fixture.awayScore} />
        </button>
      )}

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
