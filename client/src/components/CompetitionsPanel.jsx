import { useState } from 'react';
import { useCupData } from '../lib/useCupData.jsx';
import { competitionScope, SERIE_A_VALUE } from '../lib/competitions.js';
import { callWithReauth } from '../lib/reauth.js';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

// Serie A is a real row in the "competitions" tab (see competitions.js), but
// gets a simplified block here - just the logo, no scope selector (scope
// only matters for filtering cup-fixture opponents, which Serie A never is).
function SerieARow({ competition, session, saveCompetition }) {
  const [logoURL, setLogoURL] = useState(competition?.logoURL ?? '');
  const [error, setError] = useState(null);

  async function commit() {
    if (logoURL === (competition?.logoURL ?? '')) return;
    setError(null);
    try {
      await callWithReauth(session, (token) => saveCompetition(SERIE_A_VALUE, { logoURL }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  if (!competition) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2">
        {competition.logoURL && <img src={competition.logoURL} alt="" className="h-5 max-w-[80px] object-contain" />}
        <span className="text-sm font-semibold text-white">Serie A</span>
      </div>
      <input
        type="text"
        value={logoURL}
        disabled={!session.signedIn}
        onChange={(e) => setLogoURL(e.target.value)}
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
  const [logoURL, setLogoURL] = useState(competition.logoURL ?? '');
  const [error, setError] = useState(null);

  async function commitLogoURL() {
    if (logoURL === (competition.logoURL ?? '')) return;
    setError(null);
    try {
      await callWithReauth(session, (token) => saveCompetition(competition.slug, { logoURL }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  async function commitScope(scope) {
    setError(null);
    try {
      await callWithReauth(session, (token) => saveCompetition(competition.slug, { scope }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2">
        {competition.logoURL && <img src={competition.logoURL} alt="" className="h-5 max-w-[80px] object-contain" />}
        <span className="text-sm font-semibold text-white">{competition.name}</span>
      </div>
      <input
        type="text"
        value={logoURL}
        onChange={(e) => setLogoURL(e.target.value)}
        onBlur={commitLogoURL}
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
  const serieA = competitions.find((c) => c.slug === SERIE_A_VALUE);
  const cupCompetitions = competitions.filter((c) => c.slug !== SERIE_A_VALUE);
  const [newName, setNewName] = useState('');
  const [newLogoURL, setNewLogoURL] = useState('');
  const [newScope, setNewScope] = useState('national');
  const [createError, setCreateError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) {
      setCreateError('Enter a competition name.');
      return;
    }
    try {
      await callWithReauth(session, (token) =>
        createCompetition(
          { slug: slugify(newName), name: newName.trim(), logoURL: newLogoURL.trim(), scope: newScope },
          token
        )
      );
      setNewName('');
      setNewLogoURL('');
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
          <SerieARow competition={serieA} session={session} saveCompetition={saveCompetition} />
          {cupCompetitions.map((c) => (
            <CompetitionRow key={c.slug} competition={c} session={session} saveCompetition={saveCompetition} />
          ))}
          {session.signedIn && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className={`self-start rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  showAddForm ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Add competition {showAddForm ? '▴' : '▾'}
              </button>
              {showAddForm && (
                <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New competition name"
                    className={`${inputClass} w-48`}
                  />
                  <input
                    type="text"
                    value={newLogoURL}
                    onChange={(e) => setNewLogoURL(e.target.value)}
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
            </div>
          )}
          {createError && <p className="text-xs text-red-300">{createError}</p>}
        </div>
      )}
    </div>
  );
}
