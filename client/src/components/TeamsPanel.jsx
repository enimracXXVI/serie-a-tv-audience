import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
import ColorField from './ColorField.jsx';
import CollapsibleSection from './CollapsibleSection.jsx';
import { useClubs } from '../lib/useClubs.jsx';
import { clubScope, slugify } from '../lib/clubs.js';
import { callWithReauth } from '../lib/reauth.js';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

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

function ScopeField({ value, onCommit }) {
  return (
    <Field label="Scope">
      <select value={clubScope({ scope: value })} onChange={(e) => onCommit(e.target.value)} className={`${inputClass} w-32`}>
        <option value="current">Current roster</option>
        <option value="national">National</option>
        <option value="european">European</option>
      </select>
    </Field>
  );
}

function ClubRow({ club, session, saveClub, removeClub }) {
  const [expanded, setExpanded] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function commit(fields) {
    setSaveError(null);
    try {
      await callWithReauth(session, (token) => saveClub(club.slug, fields, token));
    } catch (err) {
      setSaveError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${club.name}"? This can't be undone from here - you'd need to re-add it by hand.`)) {
      return;
    }
    setDeleting(true);
    setSaveError(null);
    try {
      await callWithReauth(session, (token) => removeClub(club.slug, token));
    } catch (err) {
      setSaveError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg bg-white/5">
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <Crest team={club} size={26} />
        <span className="flex-1 text-sm font-bold text-white">{club.name}</span>
        <span className="text-xs font-semibold text-white/40">{club.short}</span>
        <span className="text-white/40">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-3 py-3">
          {session.signedIn ? (
            <>
              <div className="flex flex-wrap gap-2">
                <TextField label="Name" value={club.name} onCommit={(v) => commit({ name: v })} />
                <TextField
                  label="Short code"
                  value={club.short}
                  maxLength={3}
                  uppercase
                  onCommit={(v) => commit({ short: v })}
                />
                <ColorField label="Primary colour" value={club.primary} onCommit={(v) => commit({ primary: v })} />
                <ColorField label="Secondary colour" value={club.secondary} onCommit={(v) => commit({ secondary: v })} />
                <ScopeField value={club.scope} onCommit={(v) => commit({ scope: v })} />
              </div>
              <TextField
                label="Crest image URL"
                value={club.crestUrl}
                width="w-full"
                onCommit={(v) => commit({ crestUrl: v })}
              />
              {saveError && (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
                  {saveError}
                </p>
              )}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-fit rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete club'}
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-1 text-xs text-white/50">
              <span>Primary colour: {club.primary || '-'}</span>
              <span>Secondary colour: {club.secondary || '-'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddClubForm({ session, createClub }) {
  const [name, setName] = useState('');
  const [crestUrl, setCrestUrl] = useState('');
  const [scope, setScope] = useState('national');
  const [createError, setCreateError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setCreateError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError('Enter a club name - it must match exactly how it appears in a fixture (unless the fixture is created from the app, which uses the slug below automatically).');
      return;
    }
    try {
      await callWithReauth(session, (token) =>
        createClub(
          {
            name: trimmed,
            slug: slugify(trimmed),
            short: trimmed.slice(0, 3).toUpperCase(),
            crestUrl: crestUrl.trim(),
            primary: '#0f1e54',
            secondary: '#ffffff',
            scope,
          },
          token
        )
      );
      setName('');
      setCrestUrl('');
      setScope('national');
    } catch (err) {
      setCreateError(err.message);
    }
  }

  return (
    <>
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg bg-white/5 px-3 py-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Club name"
          className={`${inputClass} w-48`}
        />
        <input
          type="text"
          value={crestUrl}
          onChange={(e) => setCrestUrl(e.target.value)}
          placeholder="Crest URL (optional)"
          className={`${inputClass} w-48`}
        />
        <select value={scope} onChange={(e) => setScope(e.target.value)} className={inputClass}>
          <option value="current">Current roster</option>
          <option value="national">National</option>
          <option value="european">European</option>
        </select>
        <button type="submit" className="rounded-md bg-[#1fd8c9] px-3 py-1.5 text-xs font-bold text-[#0f1e54] hover:brightness-95">
          Add
        </button>
      </form>
      {createError && <p className="text-xs text-red-300">{createError}</p>}
    </>
  );
}

export default function TeamsPanel({ session }) {
  const { clubs, loading, error, saveClub, createClub, removeClub } = useClubs();
  const current = useMemo(() => clubs.filter((c) => clubScope(c) === 'current'), [clubs]);
  const national = useMemo(() => clubs.filter((c) => clubScope(c) === 'national'), [clubs]);
  const european = useMemo(() => clubs.filter((c) => clubScope(c) === 'european'), [clubs]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-white/40">
        Every club the app knows about - the current Serie A roster and everyone else (a former Serie A club, a
        domestic cup opponent, a European cup opponent) - in one place. "Scope" decides which group a club shows up
        in and which cup fixtures offer it as an opponent.
      </p>
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to add or edit clubs.</p>}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <CollapsibleSection title={`Current roster (${current.length})`}>
            <div className="flex flex-col gap-1.5">
              {current.length === 0 && <p className="text-xs text-white/40">None added yet.</p>}
              {current.map((c) => (
                <ClubRow key={c.slug} club={c} session={session} saveClub={saveClub} removeClub={removeClub} />
              ))}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title={`National (${national.length})`}>
            <div className="flex flex-col gap-1.5">
              {national.length === 0 && <p className="text-xs text-white/40">None added yet.</p>}
              {national.map((c) => (
                <ClubRow key={c.slug} club={c} session={session} saveClub={saveClub} removeClub={removeClub} />
              ))}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title={`European (${european.length})`}>
            <div className="flex flex-col gap-1.5">
              {european.length === 0 && <p className="text-xs text-white/40">None added yet.</p>}
              {european.map((c) => (
                <ClubRow key={c.slug} club={c} session={session} saveClub={saveClub} removeClub={removeClub} />
              ))}
            </div>
          </CollapsibleSection>
          {session.signedIn && <AddClubForm session={session} createClub={createClub} />}
        </div>
      )}
    </div>
  );
}
