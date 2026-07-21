import { useState } from 'react';
import { useCupData } from '../lib/useCupData.jsx';
import { competitionScope } from '../lib/competitions.js';
import { useAppSettings } from '../lib/useAppSettings.jsx';
import { callWithReauth } from '../lib/reauth.js';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

// Serie A itself isn't a row in the "competitions" tab (it's not a cup, and
// has no fixtures of its own there) - but its logo is exactly the same kind
// of setting as every entry below it, so it lives in the same section
// instead of a separate "Serie A logo" one just for this one field.
function SerieALogoField({ session }) {
  const { serieALogoUrl, loading, saveAppSettings } = useAppSettings();
  const [draft, setDraft] = useState(serieALogoUrl ?? '');
  const [error, setError] = useState(null);

  async function commit() {
    if (draft === (serieALogoUrl ?? '')) return;
    setError(null);
    try {
      await callWithReauth(session, (token) => saveAppSettings({ serieALogoUrl: draft }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2">
        {serieALogoUrl && <img src={serieALogoUrl} alt="" className="h-5 max-w-[80px] object-contain" />}
        <span className="text-sm font-semibold text-white">Serie A</span>
      </div>
      <input
        type="text"
        value={draft}
        disabled={!session.signedIn}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder="Logo image URL"
        className={`${inputClass} w-full`}
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function CompetitionRow({ competition, session, saveCompetition }) {
  const [logoUrl, setLogoUrl] = useState(competition.logoUrl ?? '');
  const [error, setError] = useState(null);

  async function commitLogoUrl() {
    if (logoUrl === (competition.logoUrl ?? '')) return;
    setError(null);
    try {
      await callWithReauth(session, (token) => saveCompetition(competition.value, { logoUrl }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  async function commitScope(scope) {
    setError(null);
    try {
      await callWithReauth(session, (token) => saveCompetition(competition.value, { scope }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2">
        {competition.logoUrl && <img src={competition.logoUrl} alt="" className="h-5 max-w-[80px] object-contain" />}
        <span className="text-sm font-semibold text-white">{competition.label}</span>
      </div>
      <input
        type="text"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        onBlur={commitLogoUrl}
        placeholder="Logo image URL"
        className={`${inputClass} w-full`}
      />
      <label className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Scope</span>
        <select
          value={competitionScope(competition)}
          onChange={(e) => commitScope(e.target.value)}
          className={`${inputClass} w-32`}
        >
          <option value="national">National</option>
          <option value="european">European</option>
        </select>
      </label>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

export default function CompetitionsPanel({ session }) {
  const { competitions, loading, error, saveCompetition, createCompetition } = useCupData();
  const [newLabel, setNewLabel] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newScope, setNewScope] = useState('national');
  const [createError, setCreateError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setCreateError(null);
    if (!newLabel.trim()) {
      setCreateError('Enter a competition name.');
      return;
    }
    try {
      await callWithReauth(session, (token) =>
        createCompetition(
          { value: slugify(newLabel), label: newLabel.trim(), logoUrl: newLogoUrl.trim(), scope: newScope },
          token
        )
      );
      setNewLabel('');
      setNewLogoUrl('');
      setNewScope('national');
    } catch (err) {
      setCreateError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to add or edit competition logos.</p>}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <SerieALogoField session={session} />
          {competitions.map((c) => (
            <CompetitionRow key={c.value} competition={c} session={session} saveCompetition={saveCompetition} />
          ))}
          {session.signedIn && (
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg bg-white/5 px-3 py-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="New competition name"
                className={`${inputClass} w-48`}
              />
              <input
                type="text"
                value={newLogoUrl}
                onChange={(e) => setNewLogoUrl(e.target.value)}
                placeholder="Logo image URL (optional)"
                className={`${inputClass} w-56`}
              />
              <select value={newScope} onChange={(e) => setNewScope(e.target.value)} className={inputClass}>
                <option value="national">National</option>
                <option value="european">European</option>
              </select>
              <button type="submit" className="rounded-md bg-[#1fd8c9] px-3 py-1.5 text-xs font-bold text-[#0f1e54] hover:brightness-95">
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
