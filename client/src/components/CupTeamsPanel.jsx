import { useState } from 'react';
import Crest from './Crest.jsx';
import { useCupData } from '../lib/useCupData.jsx';
import { callWithReauth } from '../lib/reauth.js';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function CupTeamRow({ team, session, saveCupTeam }) {
  const [crestUrl, setCrestUrl] = useState(team.crestUrl ?? '');
  const [error, setError] = useState(null);

  async function commit() {
    if (crestUrl === (team.crestUrl ?? '')) return;
    setError(null);
    try {
      await callWithReauth(session, (token) => saveCupTeam(team.slug, { crestUrl }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2">
        <Crest team={team} size={22} />
        <span className="text-sm font-semibold text-white">{team.name}</span>
      </div>
      <input
        type="text"
        value={crestUrl}
        onChange={(e) => setCrestUrl(e.target.value)}
        onBlur={commit}
        placeholder="Crest image URL"
        className={`${inputClass} w-full`}
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

function CompetitionSection({ competition, teams, session, saveCupTeam, createCupTeam }) {
  const [newName, setNewName] = useState('');
  const [newCrestUrl, setNewCrestUrl] = useState('');
  const [createError, setCreateError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) {
      setCreateError('Enter a club name.');
      return;
    }
    try {
      await callWithReauth(session, (token) =>
        createCupTeam(
          {
            slug: slugify(newName),
            name: newName.trim(),
            short: newName.trim().slice(0, 3).toUpperCase(),
            crestUrl: newCrestUrl.trim(),
            primary: '#0f1e54',
            secondary: '#ffffff',
            competition: competition.value,
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
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wide text-white/50">{competition.label}</h3>
      {teams.length === 0 && <p className="text-xs text-white/40">No opponents added yet.</p>}
      {teams.map((t) => (
        <CupTeamRow key={t.slug} team={t} session={session} saveCupTeam={saveCupTeam} />
      ))}
      {session.signedIn && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg bg-white/5 px-3 py-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New opponent name"
            className={`${inputClass} w-40`}
          />
          <input
            type="text"
            value={newCrestUrl}
            onChange={(e) => setNewCrestUrl(e.target.value)}
            placeholder="Crest URL (optional)"
            className={`${inputClass} w-48`}
          />
          <button type="submit" className="rounded-md bg-[#1fd8c9] px-3 py-1.5 text-xs font-bold text-[#0f1e54] hover:brightness-95">
            Add
          </button>
        </form>
      )}
      {createError && <p className="text-xs text-red-300">{createError}</p>}
    </div>
  );
}

export default function CupTeamsPanel({ session }) {
  const { cupTeams, competitions, loading, error, saveCupTeam, createCupTeam } = useCupData();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">Cup competition teams</h2>
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to add or edit cup opponents.</p>}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
      ) : (
        competitions.map((c) => (
          <CompetitionSection
            key={c.value}
            competition={c}
            teams={cupTeams.filter((t) => t.competition === c.value)}
            session={session}
            saveCupTeam={saveCupTeam}
            createCupTeam={createCupTeam}
          />
        ))
      )}
    </div>
  );
}
