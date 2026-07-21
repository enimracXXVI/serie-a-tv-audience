import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
import ColorField from './ColorField.jsx';
import CollapsibleSection from './CollapsibleSection.jsx';
import { useOtherClubs } from '../lib/useOtherClubs.jsx';
import { callWithReauth } from '../lib/reauth.js';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function scopeOf(club) {
  return club?.scope === 'european' ? 'european' : 'national';
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

function OtherClubRow({ club, session, saveOtherClub }) {
  const [expanded, setExpanded] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const previewClub = { ...club, slug: slugify(club.name) };

  async function commit(fields) {
    setSaveError(null);
    try {
      await callWithReauth(session, (token) => saveOtherClub(club.name, fields, token));
    } catch (err) {
      setSaveError(err.message);
    }
  }

  return (
    <div className="rounded-lg bg-white/5">
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <Crest team={previewClub} size={26} />
        <span className="flex-1 text-sm font-bold text-white">{club.name}</span>
        <span className="text-xs font-semibold text-white/40">{club.short}</span>
        <span className="text-white/40">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-3 py-3">
          {session.signedIn ? (
            <>
              <div className="flex flex-wrap gap-2">
                <TextField
                  label="Short code"
                  value={club.short}
                  maxLength={3}
                  uppercase
                  onCommit={(v) => commit({ short: v })}
                />
                <ColorField label="Primary colour" value={club.primary} onCommit={(v) => commit({ primary: v })} />
                <ColorField label="Secondary colour" value={club.secondary} onCommit={(v) => commit({ secondary: v })} />
                <Field label="Scope">
                  <select
                    value={scopeOf(club)}
                    onChange={(e) => commit({ scope: e.target.value })}
                    className={`${inputClass} w-32`}
                  >
                    <option value="national">National</option>
                    <option value="european">European</option>
                  </select>
                </Field>
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
            </>
          ) : (
            <div className="flex flex-col gap-1 text-xs text-white/50">
              <span>Primary colour: {club.primary || '-'}</span>
              <span>Secondary colour: {club.secondary || '-'}</span>
              <span>Scope: {scopeOf(club) === 'european' ? 'European' : 'National'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddClubForm({ session, createOtherClub }) {
  const [name, setName] = useState('');
  const [crestUrl, setCrestUrl] = useState('');
  const [scope, setScope] = useState('national');
  const [createError, setCreateError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setCreateError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError('Enter a club name - it must match exactly how it appears in a fixture.');
      return;
    }
    try {
      await callWithReauth(session, (token) =>
        createOtherClub(
          {
            name: trimmed,
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
          placeholder="Club name (exact match)"
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

export default function OtherClubsPanel({ session }) {
  const { otherClubs, loading, saveOtherClub, createOtherClub } = useOtherClubs();
  const national = useMemo(() => otherClubs.filter((c) => scopeOf(c) === 'national'), [otherClubs]);
  const european = useMemo(() => otherClubs.filter((c) => scopeOf(c) === 'european'), [otherClubs]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-white/40">
        Branding for any club that isn't in the current 20-club roster - a former Serie A club, a domestic cup
        opponent (national) or a European cup opponent (european). The name must match exactly how that club appears
        in a fixture.
      </p>
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to add or edit other clubs.</p>}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <CollapsibleSection title={`National (${national.length})`}>
            <div className="flex flex-col gap-1.5">
              {national.length === 0 && <p className="text-xs text-white/40">None added yet.</p>}
              {national.map((c) => (
                <OtherClubRow key={c.name} club={c} session={session} saveOtherClub={saveOtherClub} />
              ))}
            </div>
          </CollapsibleSection>
          <CollapsibleSection title={`European (${european.length})`}>
            <div className="flex flex-col gap-1.5">
              {european.length === 0 && <p className="text-xs text-white/40">None added yet.</p>}
              {european.map((c) => (
                <OtherClubRow key={c.name} club={c} session={session} saveOtherClub={saveOtherClub} />
              ))}
            </div>
          </CollapsibleSection>
          {session.signedIn && <AddClubForm session={session} createOtherClub={createOtherClub} />}
        </div>
      )}
    </div>
  );
}
