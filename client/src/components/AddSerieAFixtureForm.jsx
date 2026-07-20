import { useState } from 'react';

const inputClass =
  'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-[#0f1e54] outline-none focus:border-[#1fd8c9]';

// matchday stays put between submissions so adding a full matchday's worth
// of fixtures is: submit, pick the next two clubs, submit again - no need
// to re-enter the matchday number each time.
export default function AddSerieAFixtureForm({ teams, onCreate, onDone }) {
  const [matchday, setMatchday] = useState('');
  const [homeSlug, setHomeSlug] = useState('');
  const [awaySlug, setAwaySlug] = useState('');
  const [date, setDate] = useState('');
  const [kickoffTime, setKickoffTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!matchday) {
      setError('Enter a matchday number.');
      return;
    }
    if (!homeSlug || !awaySlug) {
      setError('Pick both a home and an away club.');
      return;
    }
    if (homeSlug === awaySlug) {
      setError('Home and away must be different clubs.');
      return;
    }
    setSaving(true);
    try {
      await onCreate({ matchday: Number(matchday), homeSlug, awaySlug, date: date || '', kickoffTime: kickoffTime || '' });
      // matchday stays put; the rest resets for the next fixture.
      setHomeSlug('');
      setAwaySlug('');
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
        <input
          type="number"
          min="1"
          value={matchday}
          onChange={(e) => setMatchday(e.target.value)}
          placeholder="Matchday"
          className={`${inputClass} w-24`}
        />
        <select value={homeSlug} onChange={(e) => setHomeSlug(e.target.value)} className={inputClass}>
          <option value="">Home club…</option>
          {teams.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={awaySlug} onChange={(e) => setAwaySlug(e.target.value)} className={inputClass}>
          <option value="">Away club…</option>
          {teams.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
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
