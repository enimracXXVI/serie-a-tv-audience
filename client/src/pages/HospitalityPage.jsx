import { useMemo, useState } from 'react';
import { useSession } from '../lib/useSession.jsx';
import { useSeasons } from '../lib/useSeasons.jsx';
import { useTeams } from '../lib/useTeams.jsx';
import { useFixtures } from '../lib/useFixtures.js';
import { useCupFixtures } from '../lib/useCupFixtures.js';
import { useCupData } from '../lib/useCupData.jsx';
import { useHospitalityGuests } from '../lib/useHospitalityGuests.jsx';
import { SERIE_A_VALUE } from '../lib/competitions.js';
import { callWithReauth } from '../lib/reauth.js';
import { exportHospitalityGuestsCsv } from '../lib/exportHospitalityCsv.js';
import { useConfirm } from '../lib/useConfirm.jsx';
import Crest from '../components/Crest.jsx';
import Dropdown from '../components/Dropdown.jsx';
import Card from '../components/Card.jsx';
import GuestForm from '../components/GuestForm.jsx';

const SERIE_A_OPTION = { value: SERIE_A_VALUE, label: 'Serie A' };

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// One row in the "pick which of this matchday/round's matches to work on"
// list - a plain checkbox-style toggle rather than a dropdown, since seeing
// every candidate (and its own ticket count) at once is the point here, not
// hiding them behind a closed trigger like MultiSelectDropdown's broadcaster
// picker.
function FixtureToggleRow({ fixture, checked, onToggle, ticketsRemaining }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition-colors ${
        checked ? 'border-[#1fd8c9] bg-[#1fd8c9]/10' : 'border-gray-100 bg-white hover:border-[#1fd8c9]/40'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none ${
          checked ? 'border-[#1fd8c9] bg-[#1fd8c9] text-white' : 'border-gray-300'
        }`}
      >
        {checked && '✓'}
      </span>
      <Crest team={fixture.home} size={18} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0f1e54]">
        {fixture.home.name} vs {fixture.away.name}
      </span>
      <span className="shrink-0 text-xs text-gray-400">{formatDateShort(fixture.date)}</span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          ticketsRemaining !== null && ticketsRemaining <= 0
            ? 'bg-red-100 text-red-600'
            : 'bg-emerald-100 text-emerald-700'
        }`}
      >
        {ticketsRemaining === null ? 'No cap set' : `${ticketsRemaining} left`}
      </span>
    </button>
  );
}

function GuestRow({ guest, onDelete }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-2 py-1.5 text-sm font-semibold text-[#0f1e54]">
        {guest.lastName} {guest.firstName}
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-500">{guest.dateOfBirth}</td>
      <td className="px-2 py-1.5 text-xs text-gray-500">
        {guest.nationOfBirth}
        {guest.cityOfBirth ? ` · ${guest.cityOfBirth} (${guest.provinceOfBirth})` : ''}
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-500">
        {guest.nationOfResidence}
        {guest.cityOfResidence ? ` · ${guest.cityOfResidence} (${guest.provinceOfResidence})` : ''}
      </td>
      <td className="px-2 py-1.5 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-red-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-red-500 hover:bg-red-50"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

// One card per selected match - a guest list is per-match, not shared
// across every match selected from the matchday/round above (see
// HospitalityPage's own top-level note on this).
function MatchGuestSection({ fixture, competitionLabel, guests, session, addGuest, removeGuest }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirm, confirmDialog] = useConfirm();

  const ticketsRemaining =
    fixture.home.ticketsCount === null || fixture.home.ticketsCount === undefined
      ? null
      : fixture.home.ticketsCount - guests.length;

  async function handleAdd(guestFields) {
    setSaving(true);
    setError(null);
    try {
      const fields = {
        season: fixture.season,
        competition: competitionLabel,
        matchday: fixture.matchday || '',
        round: fixture.round || '',
        fixtureId: fixture.id,
        homeTeam: fixture.home.name,
        awayTeam: fixture.away.name,
        matchDate: fixture.date || '',
        kickoffTime: fixture.kickoffTime || '',
        addedBy: session.login || '',
        createdAt: new Date().toISOString(),
        ...guestFields,
      };
      await callWithReauth(session, (token) => addGuest(fields, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(guest) {
    if (!(await confirm(`Remove ${guest.firstName} ${guest.lastName} from this match's guest list?`))) return;
    setError(null);
    try {
      await callWithReauth(session, (token) => removeGuest(guest.id, token));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleExport() {
    const safeName = `${fixture.home.slug}-vs-${fixture.away.slug}-${fixture.date || 'tbd'}`;
    exportHospitalityGuestsCsv(guests, `hospitality-${safeName}.csv`);
  }

  return (
    <Card
      title={`${fixture.home.name} vs ${fixture.away.name}`}
      controls={
        <>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
              ticketsRemaining !== null && ticketsRemaining <= 0 ? 'bg-red-500/20 text-red-600' : 'bg-white/40 text-[#0f1e54]'
            }`}
          >
            {ticketsRemaining === null ? 'No cap set' : `${ticketsRemaining} of ${fixture.home.ticketsCount} left`}
          </span>
          <button
            type="button"
            onClick={handleExport}
            disabled={guests.length === 0}
            className="rounded-full bg-white/40 px-3 py-1 text-[10px] font-bold uppercase text-[#0f1e54] hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download CSV
          </button>
        </>
      }
    >
      {confirmDialog}
      <div className="flex flex-col gap-3">
        {guests.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  <th className="px-2 py-1.5 text-left">Guest</th>
                  <th className="px-2 py-1.5 text-left">DOB</th>
                  <th className="px-2 py-1.5 text-left">Birth</th>
                  <th className="px-2 py-1.5 text-left">Residence</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <GuestRow key={g.id} guest={g} onDelete={() => handleDelete(g)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
        <GuestForm existingGuests={guests} onAdd={handleAdd} saving={saving} />
      </div>
    </Card>
  );
}

export default function HospitalityPage() {
  const session = useSession();
  const { currentSeason } = useSeasons();
  const { teams } = useTeams();
  const { competitions } = useCupData();
  const { fixtures: serieAFixtures, loading: serieALoading } = useFixtures([], teams);
  const { fixtures: cupFixturesAll, loading: cupLoading } = useCupFixtures(currentSeason);
  const { guests, loading: guestsLoading, error: guestsError, addGuest, removeGuest } = useHospitalityGuests();

  const [competitionValue, setCompetitionValue] = useState(SERIE_A_VALUE);
  const [group, setGroup] = useState('');
  const [selectedFixtureIds, setSelectedFixtureIds] = useState([]);

  const isSerieA = competitionValue === SERIE_A_VALUE;
  const cupCompetitions = competitions.filter((c) => c.slug !== SERIE_A_VALUE);
  const competitionOptions = [SERIE_A_OPTION, ...cupCompetitions.map((c) => ({ value: c.slug, label: c.name }))];
  const competitionLabel = isSerieA ? 'Serie A' : cupCompetitions.find((c) => c.slug === competitionValue)?.name ?? competitionValue;

  const poolFixtures = useMemo(() => {
    const withSeason = (f) => ({ ...f, season: currentSeason.label });
    return isSerieA
      ? serieAFixtures.map(withSeason)
      : cupFixturesAll.filter((f) => f.competition === competitionValue).map(withSeason);
  }, [isSerieA, serieAFixtures, cupFixturesAll, competitionValue, currentSeason.label]);

  const groupOptions = useMemo(() => {
    if (isSerieA) {
      return [...new Set(poolFixtures.map((f) => f.matchday).filter((md) => md !== null && md !== undefined))]
        .sort((a, b) => a - b)
        .map((md) => ({ value: String(md), label: `Matchday ${md}` }));
    }
    const seen = new Set();
    const options = [];
    for (const f of poolFixtures) {
      if (f.round && !seen.has(f.round)) {
        seen.add(f.round);
        options.push({ value: f.round, label: f.round });
      }
    }
    return options;
  }, [isSerieA, poolFixtures]);

  const groupFixtures = poolFixtures.filter((f) => (isSerieA ? String(f.matchday) === group : f.round === group));
  // Only home clubs with hospitality tickets turned on for this season show
  // up at all - see the Tickets toggle in Settings > Sponsorship/big match/
  // derby, right next to LED (TeamSeasonsPanel).
  const ticketFixtures = groupFixtures.filter((f) => f.home.ticketsAvailable);

  function guestsForFixture(fixtureId) {
    return guests.filter((g) => g.fixtureId === fixtureId && g.season === currentSeason.label);
  }

  function toggleFixture(id) {
    setSelectedFixtureIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selectedFixtures = ticketFixtures.filter((f) => selectedFixtureIds.includes(f.id));

  if (!session.signedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm rounded-2xl bg-white/5 p-6 text-center">
          <p className="text-sm text-white/70">
            Hospitality guest lists hold personal data, so this section is only available signed in.
          </p>
          <button
            onClick={session.signIn}
            className="mt-4 rounded-full bg-[#1fd8c9] px-4 py-2 text-xs font-bold text-[#0f1e54] hover:brightness-95"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const loading = serieALoading || cupLoading || guestsLoading;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 pr-36">
          <h1 className="text-lg font-black text-white sm:text-xl">Hospitality</h1>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white/5 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Competition</span>
            <Dropdown
              variant="sidebar"
              className="w-44"
              value={competitionValue}
              onChange={(v) => {
                setCompetitionValue(v);
                setGroup('');
                setSelectedFixtureIds([]);
              }}
              options={competitionOptions}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{isSerieA ? 'Matchday' : 'Round'}</span>
            <Dropdown
              variant="sidebar"
              className="w-44"
              value={group}
              onChange={(v) => {
                setGroup(v);
                setSelectedFixtureIds([]);
              }}
              options={groupOptions.length > 0 ? groupOptions : [{ value: '', label: 'None yet' }]}
            />
          </div>
        </div>

        {guestsError && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200">{guestsError}</p>
        )}

        {loading ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : !group ? (
          <p className="text-sm text-white/40">Pick a {isSerieA ? 'matchday' : 'round'} to see its matches.</p>
        ) : ticketFixtures.length === 0 ? (
          <p className="text-sm text-white/40">
            No match in this {isSerieA ? 'matchday' : 'round'} has a home club with hospitality tickets turned on for{' '}
            {currentSeason.label}.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/40">Pick one or more matches</span>
            {ticketFixtures.map((f) => (
              <FixtureToggleRow
                key={f.id}
                fixture={f}
                checked={selectedFixtureIds.includes(f.id)}
                onToggle={() => toggleFixture(f.id)}
                ticketsRemaining={
                  f.home.ticketsCount === null || f.home.ticketsCount === undefined
                    ? null
                    : f.home.ticketsCount - guestsForFixture(f.id).length
                }
              />
            ))}
          </div>
        )}

        {selectedFixtures.map((f) => (
          <MatchGuestSection
            key={f.id}
            fixture={f}
            competitionLabel={competitionLabel}
            guests={guestsForFixture(f.id)}
            session={session}
            addGuest={addGuest}
            removeGuest={removeGuest}
          />
        ))}
      </main>
    </div>
  );
}
