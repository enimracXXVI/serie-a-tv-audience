import { useState } from 'react';
import Dropdown from './Dropdown.jsx';

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-[#0f1e54] shadow-sm outline-none transition-colors focus:border-[#1fd8c9] focus:bg-white focus:ring-2 focus:ring-[#1fd8c9]/20';

function Field({ label, className = '', children }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </label>
  );
}

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

  const teamOptions = teams.map((t) => ({ value: t.slug, label: t.name }));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-xl">
      <h2 className="text-sm font-black uppercase tracking-wide text-[#0f1e54]">Add a fixture</h2>
      <div className="flex flex-wrap gap-3">
        <Field label="Matchday" className="w-20">
          <input
            type="number"
            min="1"
            value={matchday}
            onChange={(e) => setMatchday(e.target.value)}
            placeholder="1"
            className={inputClass}
          />
        </Field>
        <Field label="Home club" className="w-40">
          <Dropdown
            variant="light"
            value={homeSlug}
            onChange={setHomeSlug}
            options={[{ value: '', label: 'Choose club…' }, ...teamOptions]}
          />
        </Field>
        <Field label="Away club" className="w-40">
          <Dropdown
            variant="light"
            value={awaySlug}
            onChange={setAwaySlug}
            options={[{ value: '', label: 'Choose club…' }, ...teamOptions]}
          />
        </Field>
        <Field label="Date" className="w-36">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Kickoff" className="w-28">
          <input type="time" value={kickoffTime} onChange={(e) => setKickoffTime(e.target.value)} className={inputClass} />
        </Field>
      </div>
      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-full bg-[#1fd8c9] px-5 py-2 text-xs font-bold uppercase tracking-wide text-[#0f1e54] shadow-md transition-transform hover:scale-105 disabled:opacity-50"
      >
        {saving ? 'Adding…' : 'Add fixture'}
      </button>
    </form>
  );
}
