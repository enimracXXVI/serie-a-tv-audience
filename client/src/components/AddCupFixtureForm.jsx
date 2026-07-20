import { useState } from 'react';

const inputClass =
  'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-[#0f1e54] outline-none focus:border-[#1fd8c9]';

const NEW_OPPONENT = '__new__';

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Sticky defaults (competition/round carry over between submissions) so
// adding several fixtures for the same round - a full matchday's worth of
// cup ties - doesn't mean re-picking the same competition/round every time.
export default function AddCupFixtureForm({ teams, cupTeams, competitions, onCreate, onCreateOpponent, onDone }) {
  const [competition, setCompetition] = useState(competitions[0].value);
  const [round, setRound] = useState('');
  const [ourClub, setOurClub] = useState('');
  const [opponent, setOpponent] = useState('');
  const [newOpponentName, setNewOpponentName] = useState('');
  const [newOpponentCrestUrl, setNewOpponentCrestUrl] = useState('');
  const [homeAway, setHomeAway] = useState('home');
  const [date, setDate] = useState('');
  const [kickoffTime, setKickoffTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const opponentOptions = cupTeams.filter((t) => t.competition === competition);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!ourClub) {
      setError('Pick your club.');
      return;
    }
    if (!opponent) {
      setError('Pick or add an opponent.');
      return;
    }
    setSaving(true);
    try {
      let opponentSlug = opponent;
      if (opponent === NEW_OPPONENT) {
        if (!newOpponentName.trim()) throw new Error('Enter the new opponent’s name.');
        opponentSlug = slugify(newOpponentName);
        await onCreateOpponent({
          slug: opponentSlug,
          name: newOpponentName.trim(),
          short: newOpponentName.trim().slice(0, 3).toUpperCase(),
          crestUrl: newOpponentCrestUrl.trim() || '',
          primary: '#0f1e54',
          secondary: '#ffffff',
          competition,
        });
      }
      await onCreate({
        competition,
        round: round.trim(),
        ourClub,
        opponent: opponentSlug,
        homeAway,
        date: date || '',
        kickoffTime: kickoffTime || '',
      });
      // Round/competition stay put; everything else resets for the next add.
      setOpponent('');
      setNewOpponentName('');
      setNewOpponentCrestUrl('');
      setDate('');
      setKickoffTime('');
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">Add a fixture</h2>
      <div className="flex flex-wrap gap-2">
        <select value={competition} onChange={(e) => setCompetition(e.target.value)} className={inputClass}>
          {competitions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={round}
          onChange={(e) => setRound(e.target.value)}
          placeholder="Round (e.g. Round of 16)"
          className={`${inputClass} w-48`}
        />
        <select value={ourClub} onChange={(e) => setOurClub(e.target.value)} className={inputClass}>
          <option value="">Our club…</option>
          {teams.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={opponent} onChange={(e) => setOpponent(e.target.value)} className={inputClass}>
          <option value="">Opponent…</option>
          {opponentOptions.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
          <option value={NEW_OPPONENT}>+ New opponent…</option>
        </select>
        {opponent === NEW_OPPONENT && (
          <>
            <input
              type="text"
              value={newOpponentName}
              onChange={(e) => setNewOpponentName(e.target.value)}
              placeholder="Opponent name"
              className={`${inputClass} w-40`}
            />
            <input
              type="text"
              value={newOpponentCrestUrl}
              onChange={(e) => setNewOpponentCrestUrl(e.target.value)}
              placeholder="Crest URL (optional)"
              className={`${inputClass} w-48`}
            />
          </>
        )}
        <select value={homeAway} onChange={(e) => setHomeAway(e.target.value)} className={inputClass}>
          <option value="home">Home</option>
          <option value="away">Away</option>
          <option value="neutral">Neutral venue</option>
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        <input type="time" value={kickoffTime} onChange={(e) => setKickoffTime(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black transition-transform hover:scale-105 disabled:opacity-50"
      >
        {saving ? 'Adding…' : 'Add fixture'}
      </button>
    </form>
  );
}
