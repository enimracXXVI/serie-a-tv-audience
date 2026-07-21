import { useState } from 'react';
import { competitionScope } from '../lib/competitions.js';
import { clubScope, slugify } from '../lib/clubs.js';

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-[#0f1e54] outline-none focus:border-[#1fd8c9]';

const NEW_CLUB = '__new__';

function ClubSelect({ label, value, onChange, currentRoster, opponents }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">{label}</option>
      {currentRoster.length > 0 && (
        <optgroup label="Serie A">
          {currentRoster.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </optgroup>
      )}
      {opponents.length > 0 && (
        <optgroup label="Other clubs">
          {opponents.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </optgroup>
      )}
      <option value={NEW_CLUB}>+ New club…</option>
    </select>
  );
}

// Sticky defaults (competition/round carry over between submissions) so
// adding several fixtures for the same round - a full matchday's worth of
// cup ties - doesn't mean re-picking the same competition/round every time.
// Home and away are both picked from the exact same combined list (any
// Serie A club, sponsored or not, plus any club whose scope matches the
// selected competition) - there's no "your club" side, so two of your own
// sponsored clubs can meet each other just as easily as either meeting a
// club you've never heard of. Both sides write the picked club's SLUG (not
// name text) into the fixture - see clubs.js/teams.js for why.
export default function AddCupFixtureForm({ clubs, competitions, onCreate, onCreateOpponent, onDone }) {
  const [competition, setCompetition] = useState(competitions[0].value);
  const [round, setRound] = useState('');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [newHomeClubName, setNewHomeClubName] = useState('');
  const [newHomeClubCrestUrl, setNewHomeClubCrestUrl] = useState('');
  const [newAwayClubName, setNewAwayClubName] = useState('');
  const [newAwayClubCrestUrl, setNewAwayClubCrestUrl] = useState('');
  const [neutralVenue, setNeutralVenue] = useState(false);
  const [date, setDate] = useState('');
  const [kickoffTime, setKickoffTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const scope = competitionScope(competitions.find((c) => c.value === competition));
  const currentRoster = clubs.filter((c) => clubScope(c) === 'current');
  const opponents = clubs.filter((c) => clubScope(c) === scope);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!home) {
      setError('Pick the home club.');
      return;
    }
    if (!away) {
      setError('Pick the away club.');
      return;
    }
    setSaving(true);
    try {
      let homeSlug = home;
      if (home === NEW_CLUB) {
        if (!newHomeClubName.trim()) throw new Error('Enter the new home club’s name.');
        const name = newHomeClubName.trim();
        homeSlug = slugify(name);
        await onCreateOpponent({
          name,
          slug: homeSlug,
          short: name.slice(0, 3).toUpperCase(),
          crestUrl: newHomeClubCrestUrl.trim(),
          primary: '#0f1e54',
          secondary: '#ffffff',
          scope,
        });
      }
      let awaySlug = away;
      if (away === NEW_CLUB) {
        if (!newAwayClubName.trim()) throw new Error('Enter the new away club’s name.');
        const name = newAwayClubName.trim();
        awaySlug = slugify(name);
        await onCreateOpponent({
          name,
          slug: awaySlug,
          short: name.slice(0, 3).toUpperCase(),
          crestUrl: newAwayClubCrestUrl.trim(),
          primary: '#0f1e54',
          secondary: '#ffffff',
          scope,
        });
      }
      if (homeSlug === awaySlug) {
        throw new Error('Home and away must be different clubs.');
      }
      await onCreate({
        competition,
        round: round.trim(),
        home: homeSlug,
        away: awaySlug,
        neutralVenue,
        date: date || '',
        kickoffTime: kickoffTime || '',
      });
      // Round/competition stay put; everything else resets for the next add.
      setHome('');
      setAway('');
      setNewHomeClubName('');
      setNewHomeClubCrestUrl('');
      setNewAwayClubName('');
      setNewAwayClubCrestUrl('');
      setNeutralVenue(false);
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
        <ClubSelect label="Home club…" value={home} onChange={setHome} currentRoster={currentRoster} opponents={opponents} />
        {home === NEW_CLUB && (
          <>
            <input
              type="text"
              value={newHomeClubName}
              onChange={(e) => setNewHomeClubName(e.target.value)}
              placeholder="Home club name"
              className={`${inputClass} w-40`}
            />
            <input
              type="text"
              value={newHomeClubCrestUrl}
              onChange={(e) => setNewHomeClubCrestUrl(e.target.value)}
              placeholder="Crest URL (optional)"
              className={`${inputClass} w-48`}
            />
          </>
        )}
        <ClubSelect label="Away club…" value={away} onChange={setAway} currentRoster={currentRoster} opponents={opponents} />
        {away === NEW_CLUB && (
          <>
            <input
              type="text"
              value={newAwayClubName}
              onChange={(e) => setNewAwayClubName(e.target.value)}
              placeholder="Away club name"
              className={`${inputClass} w-40`}
            />
            <input
              type="text"
              value={newAwayClubCrestUrl}
              onChange={(e) => setNewAwayClubCrestUrl(e.target.value)}
              placeholder="Crest URL (optional)"
              className={`${inputClass} w-48`}
            />
          </>
        )}
        <label className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
          <input
            type="checkbox"
            checked={neutralVenue}
            onChange={(e) => setNeutralVenue(e.target.checked)}
            className="h-4 w-4 accent-[#1fd8c9]"
          />
          Neutral venue
        </label>
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
