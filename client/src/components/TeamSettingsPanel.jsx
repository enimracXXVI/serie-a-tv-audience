import { useState } from 'react';
import Crest from './Crest.jsx';
import { useTeams } from '../lib/useTeams.jsx';

const inputClass =
  'w-full rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</span>
      {children}
    </label>
  );
}

function TextField({ label, value, onCommit, maxLength, uppercase = false, width = 'w-32' }) {
  const [draft, setDraft] = useState(value ?? '');
  return (
    <Field label={label}>
      <input
        type="text"
        maxLength={maxLength}
        placeholder="https://..."
        className={`${inputClass} ${width} ${uppercase ? 'uppercase' : ''}`}
        value={draft}
        onChange={(e) => setDraft(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        onBlur={() => {
          if (draft !== (value ?? '')) onCommit(draft);
        }}
      />
    </Field>
  );
}

function NumberField({ label, value, onCommit }) {
  const [draft, setDraft] = useState(value ?? '');
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        className={`${inputClass} w-20`}
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

function ColorField({ label, value, onCommit }) {
  const [draft, setDraft] = useState(value ?? '#000000');
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onCommit(e.target.value);
          }}
          className="h-8 w-10 cursor-pointer rounded border border-white/20 bg-transparent p-0.5"
        />
        <span className="text-xs text-white/50">{draft}</span>
      </div>
    </Field>
  );
}

function TeamSettingsRow({ team, canEdit, onSave }) {
  const [expanded, setExpanded] = useState(false);

  function commit(fields) {
    onSave(team.slug, fields);
  }

  return (
    <div className="rounded-lg bg-white/5">
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <Crest team={team} size={26} />
        <span className="flex-1 text-sm font-bold text-white">{team.name}</span>
        <span className="text-xs font-semibold text-white/40">{team.short}</span>
        {team.sponsored && (
          <span className="rounded-full bg-[#1fd8c9]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#1fd8c9]">
            Sponsor
          </span>
        )}
        <span className="text-white/40">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-3 py-3">
          {canEdit ? (
            <>
              <div className="flex flex-wrap gap-2">
                <TextField label="Name" value={team.name} onCommit={(v) => commit({ name: v })} />
                <TextField
                  label="Short code"
                  value={team.short}
                  maxLength={3}
                  uppercase
                  onCommit={(v) => commit({ short: v })}
                />
                <ColorField label="Colour" value={team.primary} onCommit={(v) => commit({ primary: v })} />
              </div>
              <TextField
                label="Crest image URL"
                value={team.crestUrl}
                width="w-full"
                onCommit={(v) => commit({ crestUrl: v })}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(team.sponsored)}
                  onChange={(e) => commit({ sponsored: e.target.checked })}
                  className="h-4 w-4 accent-[#1fd8c9]"
                />
                <span className="text-xs font-semibold text-white/70">We sponsor this team</span>
              </label>
              {team.sponsored && (
                <div className="flex flex-wrap gap-2">
                  <NumberField
                    label="Matchday sponsors"
                    value={team.matchdaySponsors}
                    onCommit={(v) => commit({ matchdaySponsors: v })}
                  />
                  <NumberField
                    label="Player mascots"
                    value={team.playerMascots}
                    onCommit={(v) => commit({ playerMascots: v })}
                  />
                  <NumberField label="Walkabouts" value={team.walkabouts} onCommit={(v) => commit({ walkabouts: v })} />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1 text-xs text-white/50">
              <span>Colour: {team.primary}</span>
              {team.sponsored ? (
                <>
                  <span>Sponsored - matchday sponsors: {team.matchdaySponsors ?? '-'}</span>
                  <span>Player mascots: {team.playerMascots ?? '-'}</span>
                  <span>Walkabouts: {team.walkabouts ?? '-'}</span>
                </>
              ) : (
                <span>Not sponsored</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamSettingsPanel({ session }) {
  const { teams, loading, error, saveTeam } = useTeams();

  async function handleSave(slug, fields) {
    try {
      await saveTeam(slug, fields, session.accessToken);
    } catch (err) {
      if (err.message === 'UNAUTHENTICATED') session.signIn();
      else console.error(err);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">Team settings</h2>
      {!session.signedIn && (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/50">
          Sign in to edit team names, codes, colours and sponsorship details.
        </p>
      )}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {teams.map((team) => (
            <TeamSettingsRow key={team.slug} team={team} canEdit={session.signedIn} onSave={handleSave} />
          ))}
        </div>
      )}
    </div>
  );
}
