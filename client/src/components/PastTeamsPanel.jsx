import { useState } from 'react';
import Crest from './Crest.jsx';
import { usePastTeams } from '../lib/usePastTeams.jsx';
import { callWithReauth } from '../lib/reauth.js';

const inputClass =
  'w-full rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

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

function PastTeamRow({ team, session, savePastTeam }) {
  const [expanded, setExpanded] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const previewTeam = { ...team, slug: slugify(team.name) };

  async function commit(fields) {
    setSaveError(null);
    try {
      await callWithReauth(session, (token) => savePastTeam(team.name, fields, token));
    } catch (err) {
      setSaveError(err.message);
    }
  }

  return (
    <div className="rounded-lg bg-white/5">
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <Crest team={previewTeam} size={26} />
        <span className="flex-1 text-sm font-bold text-white">{team.name}</span>
        <span className="text-xs font-semibold text-white/40">{team.short}</span>
        <span className="text-white/40">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-3 py-3">
          {session.signedIn ? (
            <>
              <div className="flex flex-wrap gap-2">
                <TextField
                  label="Short code"
                  value={team.short}
                  maxLength={3}
                  uppercase
                  onCommit={(v) => commit({ short: v })}
                />
                <ColorField label="Primary colour" value={team.primary} onCommit={(v) => commit({ primary: v })} />
                <ColorField label="Secondary colour" value={team.secondary} onCommit={(v) => commit({ secondary: v })} />
              </div>
              <TextField
                label="Crest image URL"
                value={team.crestUrl}
                width="w-full"
                onCommit={(v) => commit({ crestUrl: v })}
              />
              {saveError && (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
                  {saveError}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1 text-xs text-white/50">
              <span>Primary colour: {team.primary || '-'}</span>
              <span>Secondary colour: {team.secondary || '-'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PastTeamsPanel({ session }) {
  const { pastTeams, loading, savePastTeam, createPastTeam } = usePastTeams();
  const [newName, setNewName] = useState('');
  const [newCrestUrl, setNewCrestUrl] = useState('');
  const [createError, setCreateError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setCreateError(null);
    const name = newName.trim();
    if (!name) {
      setCreateError('Enter a club name - it must match exactly how it appears in an archive fixtures tab.');
      return;
    }
    try {
      await callWithReauth(session, (token) =>
        createPastTeam(
          {
            name,
            short: name.slice(0, 3).toUpperCase(),
            crestUrl: newCrestUrl.trim(),
            primary: '#0f1e54',
            secondary: '#ffffff',
          },
          token
        )
      );
      setNewName('');
      setNewCrestUrl('');
    } catch (err) {
      setCreateError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-white/40">
        Branding for clubs not in the current 20-club roster (promoted/relegated), so their crest and colours show up
        correctly on Standings/Dashboard for a past season instead of a plain placeholder. The name must match exactly
        how that club appears in an archive fixtures tab.
      </p>
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to add or edit past-season clubs.</p>}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {pastTeams.length === 0 && <p className="text-xs text-white/40">None added yet.</p>}
          {pastTeams.map((t) => (
            <PastTeamRow key={t.name} team={t} session={session} savePastTeam={savePastTeam} />
          ))}
          {session.signedIn && (
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg bg-white/5 px-3 py-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Club name (exact match)"
                className={`${inputClass} w-48`}
              />
              <input
                type="text"
                value={newCrestUrl}
                onChange={(e) => setNewCrestUrl(e.target.value)}
                placeholder="Crest URL (optional)"
                className={`${inputClass} w-48`}
              />
              <button
                type="submit"
                className="rounded-md bg-[#1fd8c9] px-3 py-1.5 text-xs font-bold text-[#0f1e54] hover:brightness-95"
              >
                Add
              </button>
            </form>
          )}
          {createError && <p className="text-xs text-red-300">{createError}</p>}
        </div>
      )}
    </div>
  );
}
