import { useState } from 'react';
import ToggleSwitch from './ToggleSwitch.jsx';
import Dropdown from './Dropdown.jsx';
import { competitionScope } from '../lib/competitions.js';
import { clubScope, slugify } from '../lib/clubs.js';

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-[#0f1e54] shadow-sm outline-none transition-colors focus:border-[#1fd8c9] focus:bg-white focus:ring-2 focus:ring-[#1fd8c9]/20';

const NEW_CLUB = '__new__';

function Field({ label, className = '', children }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function clubSelectOptions(currentRoster, opponents) {
  const options = [{ value: '', label: 'Choose club…' }];
  if (currentRoster.length > 0) {
    options.push({ divider: true, label: 'Serie A' });
    options.push(...currentRoster.map((c) => ({ value: c.slug, label: c.name })));
  }
  if (opponents.length > 0) {
    options.push({ divider: true, label: 'Other clubs' });
    options.push(...opponents.map((c) => ({ value: c.slug, label: c.name })));
  }
  options.push({ divider: true, label: ' ' });
  options.push({ value: NEW_CLUB, label: '+ New club…' });
  return options;
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
export default function AddCupFixtureForm({ clubs, competitions, broadcasters, onCreate, onCreateOpponent, onDone }) {
  const [competition, setCompetition] = useState(competitions[0].slug);
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
  // Free text, not a dropdown - a cup tie often airs on more than one
  // platform at once (see CupFixtureRow), so this is typed comma-separated
  // (e.g. "dazn,Rai Sport") rather than picked one at a time. Set here so a
  // fixture doesn't start broadcaster-less and need a separate edit-tab trip
  // just to show anything at all.
  const [broadcaster, setBroadcaster] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const scope = competitionScope(competitions.find((c) => c.slug === competition));
  const currentRoster = clubs.filter((c) => clubScope(c) === 'current');
  const opponents = clubs.filter((c) => clubScope(c) === scope);
  const clubOptions = clubSelectOptions(currentRoster, opponents);

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
        otherBroadcaster: broadcaster.trim(),
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
      setBroadcaster('');
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-xl">
      <h2 className="text-sm font-black uppercase tracking-wide text-[#0f1e54]">Add a fixture</h2>
      <div className="flex flex-wrap gap-3">
        <Field label="Competition" className="w-40">
          <Dropdown
            variant="light"
            value={competition}
            onChange={setCompetition}
            options={competitions.map((c) => ({ value: c.slug, label: c.name }))}
          />
        </Field>
        <Field label="Round" className="w-48">
          <input
            type="text"
            value={round}
            onChange={(e) => setRound(e.target.value)}
            placeholder="e.g. Round of 16"
            className={inputClass}
          />
        </Field>
        <Field label="Home club" className="w-44">
          <Dropdown variant="light" value={home} onChange={setHome} options={clubOptions} />
        </Field>
        <Field label="Away club" className="w-44">
          <Dropdown variant="light" value={away} onChange={setAway} options={clubOptions} />
        </Field>
        {home === NEW_CLUB && (
          <>
            <Field label="Home club name" className="w-40">
              <input
                type="text"
                value={newHomeClubName}
                onChange={(e) => setNewHomeClubName(e.target.value)}
                placeholder="Club name"
                className={inputClass}
              />
            </Field>
            <Field label="Home crest URL" className="w-48">
              <input
                type="text"
                value={newHomeClubCrestUrl}
                onChange={(e) => setNewHomeClubCrestUrl(e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </Field>
          </>
        )}
        {away === NEW_CLUB && (
          <>
            <Field label="Away club name" className="w-40">
              <input
                type="text"
                value={newAwayClubName}
                onChange={(e) => setNewAwayClubName(e.target.value)}
                placeholder="Club name"
                className={inputClass}
              />
            </Field>
            <Field label="Away crest URL" className="w-48">
              <input
                type="text"
                value={newAwayClubCrestUrl}
                onChange={(e) => setNewAwayClubCrestUrl(e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </Field>
          </>
        )}
        <Field label="Date" className="w-36">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Kickoff" className="w-28">
          <input type="time" value={kickoffTime} onChange={(e) => setKickoffTime(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Broadcaster(s)" className="w-56">
          <input
            type="text"
            list="cup-broadcasters"
            value={broadcaster}
            onChange={(e) => setBroadcaster(e.target.value)}
            placeholder="Comma-separated"
            className={inputClass}
          />
          <datalist id="cup-broadcasters">
            {broadcasters?.map((b) => <option key={b.slug} value={b.slug} />)}
          </datalist>
        </Field>
        <div className="flex items-end pb-1.5">
          <ToggleSwitch checked={neutralVenue} onChange={setNeutralVenue} label="Neutral venue" labelClassName="text-gray-400" />
        </div>
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
