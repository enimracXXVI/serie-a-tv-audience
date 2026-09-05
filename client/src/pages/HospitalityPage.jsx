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
import { isoToDDMMYYYY } from '../lib/dateFormat.js';
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

// Blank dates/times sort first either way - good enough for TBD fixtures,
// which is exactly how every other date column in this app already treats
// them (see FixtureRow).
function compareFixtureTime(a, b) {
  const ad = a.date || '';
  const bd = b.date || '';
  if (ad !== bd) return ad.localeCompare(bd);
  return (a.kickoffTime || '').localeCompare(b.kickoffTime || '');
}

function ticketBadgeText(guestCount, ticketsCount) {
  if (ticketsCount === null || ticketsCount === undefined) return `${guestCount} guest${guestCount === 1 ? '' : 's'}`;
  return `${guestCount}/${ticketsCount}`;
}

function isFullyBooked(guestCount, ticketsCount) {
  return ticketsCount !== null && ticketsCount !== undefined && guestCount >= ticketsCount;
}

// One row in the "pick which of this matchday/round's matches to work on"
// list - clicking it expands its own guest-list section directly below,
// rather than toggling a checkbox that fans out to a separate list further
// down the page.
function FixtureExpandRow({ fixture, expanded, onToggle, guestCount }) {
  const ticketsCount = fixture.home.ticketsCount ?? null;
  const full = isFullyBooked(guestCount, ticketsCount);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={`flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2 text-left transition-colors ${
        // An opaque tint, not a semi-transparent one - this row sits
        // directly on the page's own navy (#0f1e54) body background, the
        // same colour as the team-name text below, so a see-through
        // background here let that navy show straight through and made the
        // text unreadable once expanded.
        expanded ? 'border-[#1fd8c9] bg-teal-50' : 'border-gray-100 bg-white hover:border-[#1fd8c9]/40'
      }`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 text-[10px] text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
      >
        ▶
      </span>
      <Crest team={fixture.home} size={18} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0f1e54]">
        {fixture.home.name} vs {fixture.away.name}
      </span>
      <span className="shrink-0 text-xs text-gray-400">
        {formatDateShort(fixture.date)}
        {fixture.kickoffTime ? ` · ${fixture.kickoffTime}` : ''}
      </span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          full ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
        }`}
      >
        {ticketBadgeText(guestCount, ticketsCount)}
      </span>
    </button>
  );
}

// A guest's own name/DOB are typically typed straight into some other
// system (a stadium turnstile list, a hospitality provider's own form) once
// they're saved here - one click/tap copies just that one field's text to
// the clipboard, rather than requiring a manual double-click-and-drag
// select across a compact table cell.
function CopyableField({ value }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard API can be unavailable (insecure context, denied
      // permission, older browser) - a copy shortcut failing silently is
      // fine, the value is still right there to select by hand.
    }
  }

  if (!value) return <span className="text-gray-300">—</span>;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy"
      className={`-mx-1 rounded px-1 text-left transition-colors hover:bg-[#1fd8c9]/15 ${copied ? 'bg-[#1fd8c9]/25' : ''}`}
    >
      {copied ? 'Copied!' : value}
    </button>
  );
}

function GuestRow({ guest, onEdit, onDelete }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-2 py-1.5 text-sm font-semibold text-[#0f1e54]">
        <CopyableField value={guest.lastName} /> <CopyableField value={guest.firstName} />
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-500">
        <CopyableField value={isoToDDMMYYYY(guest.dateOfBirth)} />
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-500">
        {guest.nationOfBirth}
        {guest.cityOfBirth ? ` · ${guest.cityOfBirth} (${guest.provinceOfBirth})` : ''}
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-500">
        {guest.nationOfResidence}
        {guest.cityOfResidence ? ` · ${guest.cityOfResidence} (${guest.provinceOfResidence})` : ''}
      </td>
      <td className="px-2 py-1.5 text-right">
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-[#0f1e54] hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-red-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-red-500 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}

// One card per selected match - a guest list is per-match, not shared
// across every match selected from the matchday/round above (see
// HospitalityPage's own top-level note on this).
function MatchGuestSection({
  fixture,
  competitionValue,
  competitions,
  guests,
  allGuests,
  session,
  addGuest,
  updateGuest,
  removeGuest,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingGuest, setEditingGuest] = useState(null);
  const [confirm, confirmDialog] = useConfirm();

  const ticketsCount = fixture.home.ticketsCount ?? null;

  async function handleAdd(guestFields) {
    setSaving(true);
    setError(null);
    try {
      const fields = {
        season: fixture.season,
        // The slug (e.g. 'serie-a', a cup's own slug), not its display name
        // - matches how cup fixtures already store `competition` (see
        // isSerieARow) so this column stays a stable key. The CSV export
        // resolves it back to a human name at download time.
        competition: competitionValue,
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

  async function handleSaveEdit(guestFields) {
    setSaving(true);
    setError(null);
    try {
      await callWithReauth(session, (token) => updateGuest(editingGuest.id, guestFields, token));
      setEditingGuest(null);
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
      if (editingGuest?.id === guest.id) setEditingGuest(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleExport() {
    const safeName = `${fixture.home.slug}-vs-${fixture.away.slug}-${fixture.date || 'tbd'}`;
    exportHospitalityGuestsCsv(guests, `${safeName}.csv`, competitions);
  }

  return (
    <Card
      title={`${fixture.home.name} vs ${fixture.away.name}`}
      controls={
        <>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
              isFullyBooked(guests.length, ticketsCount) ? 'bg-red-500/20 text-red-600' : 'bg-white/40 text-[#0f1e54]'
            }`}
          >
            {ticketBadgeText(guests.length, ticketsCount)}
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
                  <GuestRow key={g.id} guest={g} onEdit={() => setEditingGuest(g)} onDelete={() => handleDelete(g)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
        <GuestForm
          existingGuests={allGuests}
          onAdd={handleAdd}
          saving={saving}
          editingGuest={editingGuest}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingGuest(null)}
        />
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
  const { guests, loading: guestsLoading, error: guestsError, addGuest, updateGuest, removeGuest } = useHospitalityGuests();

  const [competitionValue, setCompetitionValue] = useState(SERIE_A_VALUE);
  const [group, setGroup] = useState('');
  const [expandedFixtureIds, setExpandedFixtureIds] = useState([]);

  const isSerieA = competitionValue === SERIE_A_VALUE;
  const cupCompetitions = competitions.filter((c) => c.slug !== SERIE_A_VALUE);
  const competitionOptions = [SERIE_A_OPTION, ...cupCompetitions.map((c) => ({ value: c.slug, label: c.name }))];

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

  const groupFixtures = poolFixtures
    .filter((f) => (isSerieA ? String(f.matchday) === group : f.round === group))
    .sort(compareFixtureTime);
  // Only home clubs with hospitality tickets turned on for this season show
  // up at all - see the Tickets toggle in Settings > Sponsorship/big match/
  // derby, right next to LED (TeamSeasonsPanel).
  const ticketFixtures = groupFixtures.filter((f) => f.home.ticketsAvailable);
  const groupLabel = groupOptions.find((o) => o.value === group)?.label ?? group;

  function guestsForFixture(fixtureId) {
    return guests.filter((g) => g.fixtureId === fixtureId && g.season === currentSeason.label);
  }

  function toggleExpanded(id) {
    setExpandedFixtureIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const groupFixtureIds = useMemo(() => new Set(groupFixtures.map((f) => f.id)), [groupFixtures]);
  const guestsForGroup = guests.filter((g) => g.season === currentSeason.label && groupFixtureIds.has(g.fixtureId));

  function handleExportGroup() {
    const safeGroup = String(groupLabel || 'group').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    exportHospitalityGuestsCsv(guestsForGroup, `${competitionValue}-${safeGroup}.csv`, competitions);
  }

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
                setExpandedFixtureIds([]);
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
                setExpandedFixtureIds([]);
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/40">Pick a match to expand</span>
              <button
                type="button"
                onClick={handleExportGroup}
                disabled={guestsForGroup.length === 0}
                className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Download CSV for {groupLabel}
              </button>
            </div>
            {ticketFixtures.map((f) => {
              const expanded = expandedFixtureIds.includes(f.id);
              const fixtureGuests = guestsForFixture(f.id);
              return (
                <div key={f.id} className="flex flex-col gap-2">
                  <FixtureExpandRow
                    fixture={f}
                    expanded={expanded}
                    onToggle={() => toggleExpanded(f.id)}
                    guestCount={fixtureGuests.length}
                  />
                  {expanded && (
                    <MatchGuestSection
                      fixture={f}
                      competitionValue={competitionValue}
                      competitions={competitions}
                      guests={fixtureGuests}
                      allGuests={guests}
                      session={session}
                      addGuest={addGuest}
                      updateGuest={updateGuest}
                      removeGuest={removeGuest}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
