import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '../lib/useSession.jsx';
import { useSeasons } from '../lib/useSeasons.jsx';
import { useTeams } from '../lib/useTeams.jsx';
import { useClubs } from '../lib/useClubs.jsx';
import { useFixtures } from '../lib/useFixtures.js';
import { useCupFixtures } from '../lib/useCupFixtures.js';
import { useCupData } from '../lib/useCupData.jsx';
import { useGuestSources } from '../lib/useGuestSources.jsx';
import { useHospitalityGuests } from '../lib/useHospitalityGuests.jsx';
import { SERIE_A_VALUE, competitionScope } from '../lib/competitions.js';
import { callWithReauth } from '../lib/reauth.js';
import { exportHospitalityGuestsCsv } from '../lib/exportHospitalityCsv.js';
import { isoToDDMMYYYY, todayISO, excelSerialToISODate, excelSerialToTime } from '../lib/dateFormat.js';
import { instagramUrl } from '../lib/instagram.js';
import { useConfirm } from '../lib/useConfirm.jsx';
import Crest from '../components/Crest.jsx';
import ToggleSwitch from '../components/ToggleSwitch.jsx';
import Card from '../components/Card.jsx';
import GuestForm from '../components/GuestForm.jsx';

function formatDateHeading(dateStr) {
  if (!dateStr) return 'Date TBD';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Date TBD';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function competitionLabel(slug, competitions) {
  if (slug === SERIE_A_VALUE) return 'Serie A';
  return competitions.find((c) => c.slug === slug)?.name ?? slug;
}

function competitionLogo(slug, competitions) {
  return competitions.find((c) => c.slug === slug)?.logoURL || null;
}

// Short enough to sit next to a kickoff time without wrapping - only shown
// in the "by matchday" view, where there's no date heading above the row
// the way the "by date" view has one.
function formatShortDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// A guest row's matchDate/kickoffTime are copied in from the fixture at the
// moment the guest is added, then never looked up live again - so if that
// fixture's own date/kickoffTime cell was ever a raw Excel/Sheets serial
// number at that exact moment (a cell hand-typed directly into the sheet
// rather than through this app), the bad value is permanently baked into
// this row regardless of whether the live fixture itself is fine now.
// Caught here by checking the stored string isn't already the expected
// "YYYY-MM-DD"/"HH:MM" shape but does look like a plausible serial, and
// repaired the same way sheets.js's own rowToFixture would have on a clean
// read. Bounded to a sane calendar-year range so genuinely unrelated
// garbage in the field is left alone rather than "fixed" into a nonsense
// date.
function fixedMatchDate(value) {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value) || !/^\d+$/.test(value)) return null;
  const serial = Number(value);
  if (serial < 25000 || serial > 80000) return null; // roughly year 1968-2119
  return excelSerialToISODate(serial);
}

function fixedKickoffTime(value) {
  if (!value || /^\d{2}:\d{2}$/.test(value) || !/^0?\.\d+$/.test(value)) return null;
  const serial = Number(value);
  if (!(serial >= 0 && serial < 1)) return null;
  return excelSerialToTime(serial);
}

// European competitions (Champions/Europa/Conference League) always carry
// hospitality, unlike a domestic fixture - a European away side doesn't
// need its own `ticketsAvailable` toggle set for its games to show up here
// at all. Everything else (Serie A, Coppa Italia) needs either a standing
// ticket deal on the home club or a one-off override on this specific
// fixture - turned on by clicking that match's own hospitality link on the
// Fixtures/Cup page (see HospitalityLinkButton), not from anywhere on this
// page itself. A fixture without access simply isn't shown here at all.
function hasHospitalityAccess(fixture, competitions) {
  if (fixture.competition !== SERIE_A_VALUE) {
    const comp = competitions.find((c) => c.slug === fixture.competition);
    if (competitionScope(comp) === 'european') return true;
  }
  return Boolean(fixture.home.ticketsAvailable) || Boolean(fixture.hospitalityOverride);
}

function ticketBadgeText(guestCount, ticketsCount) {
  if (ticketsCount === null || ticketsCount === undefined) return `${guestCount} guest${guestCount === 1 ? '' : 's'}`;
  return `${guestCount}/${ticketsCount}`;
}

function isFullyBooked(guestCount, ticketsCount) {
  return ticketsCount !== null && ticketsCount !== undefined && guestCount >= ticketsCount;
}

// One row per fixture in the flat, date-grouped list - every fixture here
// already has hospitality access (see hasHospitalityAccess's filter above
// this is ever called with), so clicking it just expands its own
// guest-list section directly below. Getting a fixture WITHOUT standing
// tickets into this list at all happens from the Fixtures/Cup page's own
// hospitality link (see HospitalityLinkButton), never from here - but
// undoing that (isOverrideOnly) is right here on the row itself, a small
// "×" next to the badge, rather than buried inside the expanded guest
// card where it's easy to miss right after that same link just put you
// here. Removing it this way needs no guests added first.
function FixtureListRow({ fixture, expanded, onToggle, guestCount, highlighted, isOverrideOnly, onRemoveOverride, showDate }) {
  const ticketsCount = fixture.home.ticketsCount ?? null;
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);
  const [confirm, confirmDialog] = useConfirm();

  async function handleRemove(e) {
    e.stopPropagation();
    if (
      !(await confirm(
        `Remove hospitality access for ${fixture.home.name} vs ${fixture.away.name}? Any guests already added stay on file, just no longer editable from here unless you re-add it.`
      ))
    ) {
      return;
    }
    setRemoving(true);
    setError(null);
    try {
      await onRemoveOverride();
    } catch (err) {
      setError(err.message);
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {confirmDialog}
      {/* The outer box is a plain div, not a button - isOverrideOnly puts a
          real <button> (the "×") inside it as a SIBLING of the toggle
          button below, never nested inside one (nested buttons are invalid
          HTML and browsers handle the click ambiguously - see
          FixtureRow.jsx's own SummaryWrapper/DELETE split for the same
          reasoning). */}
      <div
        className={`flex w-full items-start gap-2 rounded-lg border-2 px-3 py-2 transition-colors ${
          highlighted ? 'ring-2 ring-amber-400' : ''
        } ${
          // An opaque tint, not a semi-transparent one - this row sits
          // directly on the page's own navy (#0f1e54) body background, the
          // same colour as the team-name text below, so a see-through
          // background here let that navy show straight through and made the
          // text unreadable once expanded.
          expanded ? 'border-[#1fd8c9] bg-teal-50' : 'border-gray-100 bg-white hover:border-[#1fd8c9]/40'
        }`}
      >
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span
            aria-hidden="true"
            className={`mt-1 shrink-0 text-[10px] text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            ▶
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <Crest team={fixture.home} size={16} />
              <span className="min-w-0 truncate text-sm font-semibold text-[#0f1e54]">{fixture.home.name}</span>
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              <Crest team={fixture.away} size={16} />
              <span className="min-w-0 truncate text-sm font-semibold text-[#0f1e54]">{fixture.away.name}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
            {showDate && formatShortDate(fixture.date) && (
              <span className="text-xs font-semibold text-gray-500">{formatShortDate(fixture.date)}</span>
            )}
            {fixture.kickoffTime && <span className="text-xs text-gray-400">{fixture.kickoffTime}</span>}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                isFullyBooked(guestCount, ticketsCount) ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {ticketBadgeText(guestCount, ticketsCount)}
            </span>
          </div>
        </button>
        {isOverrideOnly && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            title="Remove this one-off hospitality access - this match has no standing ticket deal"
            aria-label="Remove hospitality access for this match"
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-200 text-xs font-bold text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        )}
      </div>
      {error && <p className="px-3 text-xs text-red-300">{error}</p>}
    </div>
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

function GuestRow({ guest, guestSources, onEdit, onDelete }) {
  const sourceName = guestSources.find((s) => s.slug === guest.source)?.name;
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
      <td className="px-2 py-1.5 text-xs text-gray-500">
        {sourceName ?? '—'}
        {guest.instagramHandle && (
          <>
            {' · '}
            <a
              href={instagramUrl(guest.instagramHandle)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#1fd8c9] hover:underline"
            >
              @{guest.instagramHandle}
            </a>
          </>
        )}
      </td>
      <td className="px-2 py-1.5 text-xs text-gray-500">
        <CopyableField value={guest.email} />
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

// One card per expanded match - a guest list is per-match, not shared
// across the whole page.
function MatchGuestSection({
  fixture,
  competitions,
  clubsBySlug,
  guestSources,
  guests,
  allGuests,
  session,
  addGuest,
  updateGuest,
  removeGuest,
  isOverrideOnly,
  onRemoveOverride,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingGuest, setEditingGuest] = useState(null);
  const [removingOverride, setRemovingOverride] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  const ticketsCount = fixture.home.ticketsCount ?? null;

  async function handleRemoveOverride() {
    if (
      !(await confirm(
        `Remove hospitality access for ${fixture.home.name} vs ${fixture.away.name}? It'll go back to needing "Enable" again - any guests already added stay on file, just no longer editable from here unless you re-enable it.`
      ))
    ) {
      return;
    }
    setRemovingOverride(true);
    setError(null);
    try {
      await onRemoveOverride();
    } catch (err) {
      setError(err.message);
      setRemovingOverride(false);
    }
  }

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
        competition: fixture.competition,
        matchday: fixture.matchday || '',
        round: fixture.round || '',
        fixtureId: fixture.id,
        // The slug, not the display name - same reasoning as `competition`
        // above (a stable key, resolved back to a human name by the CSV
        // export).
        homeTeam: fixture.home.slug,
        awayTeam: fixture.away.slug,
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
    exportHospitalityGuestsCsv(guests, `${safeName}.csv`, competitions, clubsBySlug);
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
          {isOverrideOnly && (
            <button
              type="button"
              onClick={handleRemoveOverride}
              disabled={removingOverride}
              title="This match only shows up here because of a one-off hospitality override, not a standing ticket deal"
              className="rounded-full bg-white/40 px-3 py-1 text-[10px] font-bold uppercase text-red-600 hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {removingOverride ? 'Removing…' : 'Remove access'}
            </button>
          )}
        </>
      }
    >
      {confirmDialog}
      <div className="flex flex-col gap-3">
        {guests.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  <th className="px-2 py-1.5 text-left">Guest</th>
                  <th className="px-2 py-1.5 text-left">DOB</th>
                  <th className="px-2 py-1.5 text-left">Birth</th>
                  <th className="px-2 py-1.5 text-left">Residence</th>
                  <th className="px-2 py-1.5 text-left">Source</th>
                  <th className="px-2 py-1.5 text-left">Email</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <GuestRow
                    key={g.id}
                    guest={g}
                    guestSources={guestSources}
                    onEdit={() => setEditingGuest(g)}
                    onDelete={() => handleDelete(g)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
        <GuestForm
          existingGuests={allGuests}
          guestSources={guestSources}
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
  const { bySlug: clubsBySlug, byName: clubsByName } = useClubs();
  const { competitions } = useCupData();
  const { guestSources } = useGuestSources();
  const { fixtures: serieAFixtures, loading: serieALoading, updateFixture: updateSerieAFixture } = useFixtures([], teams);
  const {
    fixtures: cupFixturesAll,
    loading: cupLoading,
    updateFixture: updateCupFixture,
  } = useCupFixtures(currentSeason);
  const {
    guests,
    loading: guestsLoading,
    error: guestsError,
    addGuest,
    updateGuest,
    batchUpdateGuests,
    fixColumnFormats,
    refetch: refetchGuests,
    removeGuest,
  } = useHospitalityGuests();

  // Two independent kinds of bad legacy data a guest row can be stuck with,
  // from before each was fixed at the source: homeTeam/awayTeam holding a
  // display name instead of a slug (resolved back via clubsByName, the same
  // way a fixture's own home/away cell resolves either shape - see
  // resolveClub in teams.js), and matchDate/kickoffTime holding a raw
  // Excel/Sheets serial number instead of "YYYY-MM-DD"/"HH:MM" text (see
  // fixedMatchDate/fixedKickoffTime above). Each field is fixed
  // independently - a row needing only one of the two still gets listed and
  // repaired, nothing waits on the other one also being fixable. A field
  // that can't be resolved (an unknown club name, a number outside any
  // sane date range) is left alone rather than guessed at.
  const legacyFixes = useMemo(() => {
    if (clubsBySlug.size === 0) return [];
    return guests
      .map((g) => {
        const fields = {};
        if (!clubsBySlug.has(g.homeTeam)) {
          const resolved = clubsByName.get(g.homeTeam)?.slug;
          if (resolved) fields.homeTeam = resolved;
        }
        if (!clubsBySlug.has(g.awayTeam)) {
          const resolved = clubsByName.get(g.awayTeam)?.slug;
          if (resolved) fields.awayTeam = resolved;
        }
        const matchDate = fixedMatchDate(g.matchDate);
        if (matchDate) fields.matchDate = matchDate;
        const kickoffTime = fixedKickoffTime(g.kickoffTime);
        if (kickoffTime) fields.kickoffTime = kickoffTime;
        return Object.keys(fields).length > 0 ? { id: g.id, fields } : null;
      })
      .filter(Boolean);
  }, [guests, clubsBySlug, clubsByName]);
  const [fixingLegacyRows, setFixingLegacyRows] = useState(false);
  const [legacyFixError, setLegacyFixError] = useState(null);
  const [legacyConfirm, legacyConfirmDialog] = useConfirm();

  async function handleFixLegacyRows() {
    if (
      !(await legacyConfirm(
        `Fix ${legacyFixes.length} old guest row${legacyFixes.length === 1 ? '' : 's'} with stale internal data (the club stored by name instead of its slug, and/or the match's date or kickoff time stored as a raw spreadsheet number)? This only changes how the row is keyed/read internally - nothing a guest or export sees changes.`
      ))
    ) {
      return;
    }
    setFixingLegacyRows(true);
    setLegacyFixError(null);
    // Two separate problems compounded here. (1) One request per row (even
    // paced out) reliably tripped Sheets' own per-minute write quota
    // partway through a batch this size - fixed by sending the whole batch
    // as CHUNK_SIZE-sized groups, each ONE Sheets request covering every
    // row in it. (2) matchDate/kickoffTime's columns carry an inherited
    // Date/Time number format that silently re-coerces any RAW text write
    // of those two fields straight back into a numeric serial, no matter
    // how many times or how carefully it's rewritten - every row looked
    // "fixed" (write didn't throw, no missing column header) and then
    // reverted on the next read, because the value itself never actually
    // became text. fixColumnFormats sets both columns to Plain text first
    // (idempotent, and this also protects every future row the normal "add
    // guest" flow writes, not just this batch) so the value write right
    // after it has something to actually stick to. Either way, re-reads the
    // tab afterwards to check what's actually sitting in the sheet rather
    // than trusting the write calls' own say-so.
    const CHUNK_SIZE = 200;
    const updates = legacyFixes.map(({ id, fields }) => ({ id, fields }));
    const allResults = [];
    const chunkErrors = [];
    try {
      await callWithReauth(session, (token) => fixColumnFormats(['matchDate', 'kickoffTime'], token));
    } catch (err) {
      chunkErrors.push(err.message);
    }
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      try {
        const results = await callWithReauth(session, (token) => batchUpdateGuests(chunk, token));
        allResults.push(...results);
      } catch (err) {
        chunkErrors.push(err.message);
      }
    }
    let freshGuests = guests;
    try {
      freshGuests = await refetchGuests();
    } catch {
      // Fall back to pre-fetch verification below using current local
      // state - worse than nothing only if a write silently failed AND
      // the refetch itself failed, in which case the row stays flagged
      // next render anyway.
    }
    const freshById = new Map(freshGuests.map((g) => [g.id, g]));
    const stillBroken = updates.filter(({ id, fields }) => {
      const fresh = freshById.get(id);
      if (!fresh) return true;
      return Object.entries(fields).some(([key, value]) => fresh[key] !== value);
    });
    const verifiedFixed = updates.length - stillBroken.length;
    if (stillBroken.length > 0) {
      const missingSample = [...new Set(allResults.flatMap((r) => r.missingFields ?? []))].slice(0, 3).join(', ');
      const parts = [`Verified against the sheet: ${verifiedFixed} of ${updates.length} actually fixed, ${stillBroken.length} still wrong`];
      if (missingSample) parts.push(`no column header in "hospitalityGuests" for: ${missingSample}`);
      if (chunkErrors.length > 0) parts.push([...new Set(chunkErrors)].slice(0, 2).join('; '));
      setLegacyFixError(`${parts.join(' - ')}. Press "Fix now" again to retry.`);
    }
    setFixingLegacyRows(false);
  }

  // Every competition merged into one flat list, each fixture tagged with
  // its own `competition` slug (Serie A fixtures don't carry one of their
  // own, unlike cup rows - see enrichFixture) - this is what the date/
  // competition grouping below keys off, and what decides which of
  // updateSerieAFixture/updateCupFixture a write for that fixture needs.
  const allFixtures = useMemo(() => {
    const withSeason = (f) => ({ ...f, season: currentSeason.label });
    return [
      ...serieAFixtures.map((f) => withSeason({ ...f, competition: SERIE_A_VALUE })),
      ...cupFixturesAll.map(withSeason),
    ];
  }, [serieAFixtures, cupFixturesAll, currentSeason.label]);

  function updateFnFor(fixture) {
    return fixture.competition === SERIE_A_VALUE ? updateSerieAFixture : updateCupFixture;
  }

  async function handleEnableOverride(fixture) {
    await callWithReauth(session, (token) => updateFnFor(fixture)(fixture.id, { hospitalityOverride: true }, token));
  }

  async function handleDisableOverride(fixture) {
    await callWithReauth(session, (token) => updateFnFor(fixture)(fixture.id, { hospitalityOverride: false }, token));
  }

  // Off by default - a game whose date is before today is hidden, but
  // today's own games stay visible (only a strictly earlier date counts as
  // "past"). A fixture with no date yet (TBD) is never hidden by this,
  // there's nothing to compare.
  const [showPastGames, setShowPastGames] = useState(false);
  const [expandedFixtureIds, setExpandedFixtureIds] = useState([]);

  // Only fixtures with actual hospitality access ever show up in this list
  // at all - no dashed/muted "doesn't have tickets yet" rows cluttering it.
  // A fixture without access is brought in by clicking its own hospitality
  // link on the Fixtures/Cup page instead (see HospitalityLinkButton and
  // the deep-link effect below, which turns access on for it automatically).
  const accessFixtures = useMemo(() => {
    const dateFiltered = showPastGames ? allFixtures : allFixtures.filter((f) => !f.date || f.date >= todayISO());
    return dateFiltered.filter((f) => hasHospitalityAccess(f, competitions));
  }, [allFixtures, showPastGames, competitions]);

  const competitionOrder = useMemo(
    () => [SERIE_A_VALUE, ...competitions.filter((c) => c.slug !== SERIE_A_VALUE).map((c) => c.slug)],
    [competitions]
  );

  // Pills built from accessFixtures (pre competition-filter), not
  // visibleFixtures below, so the pill for whichever competition is
  // currently selected never disappears just because it's the only one
  // left showing - same All/Serie A/cup pill styling as the Cups page's
  // own quick-nav row, but an actual filter here rather than a scroll link,
  // since this page isn't sectioned by competition the way Cups is.
  const competitionPills = useMemo(() => {
    const present = new Set(accessFixtures.map((f) => f.competition || SERIE_A_VALUE));
    return competitionOrder
      .filter((slug) => present.has(slug))
      .map((slug) => ({ slug, label: competitionLabel(slug, competitions), logoURL: competitionLogo(slug, competitions) }));
  }, [accessFixtures, competitionOrder, competitions]);

  const [competitionFilter, setCompetitionFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('date');

  const visibleFixtures = useMemo(() => {
    if (competitionFilter === 'all') return accessFixtures;
    return accessFixtures.filter((f) => (f.competition || SERIE_A_VALUE) === competitionFilter);
  }, [accessFixtures, competitionFilter]);

  // Date first, competition second (Serie A, then every cup in the same
  // order the competitions tab lists them) - fixtures with no date yet sort
  // into their own "Date TBD" bucket at the end, after everything that's
  // actually scheduled.
  const dateGroups = useMemo(() => {
    const byDate = new Map();
    for (const f of visibleFixtures) {
      const key = f.date || '';
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(f);
    }
    const dateKeys = [...byDate.keys()].sort((a, b) => {
      if (a === '') return 1;
      if (b === '') return -1;
      return a.localeCompare(b);
    });

    return dateKeys.map((date) => {
      const byCompetition = new Map();
      for (const f of byDate.get(date)) {
        const key = f.competition || SERIE_A_VALUE;
        if (!byCompetition.has(key)) byCompetition.set(key, []);
        byCompetition.get(key).push(f);
      }
      const competitionGroups = competitionOrder
        .filter((slug) => byCompetition.has(slug))
        .map((slug) => ({
          slug,
          label: competitionLabel(slug, competitions),
          logoURL: competitionLogo(slug, competitions),
          fixtures: [...byCompetition.get(slug)].sort((a, b) => (a.kickoffTime || '').localeCompare(b.kickoffTime || '')),
        }));
      return { date, competitionGroups };
    });
  }, [visibleFixtures, competitionOrder, competitions]);

  // Matchday/round first instead of calendar date - a matchday number only
  // means anything within Serie A, and a round only within its own cup, so
  // each bucket here is already single-competition; no need for a
  // competition sub-heading the way dateGroups needs one, just the
  // competition named inline in the bucket's own heading. Buckets are
  // ordered by their earliest fixture's date so the overall list still
  // reads chronologically, with "TBD" (no matchday/round, or no dated
  // fixture in it yet) last, same convention as dateGroups' own TBD bucket.
  const matchdayGroups = useMemo(() => {
    const byKey = new Map();
    for (const f of visibleFixtures) {
      const competition = f.competition || SERIE_A_VALUE;
      const isSerieA = competition === SERIE_A_VALUE;
      const unit = isSerieA ? f.matchday : f.round;
      const key = `${competition}::${unit ?? ''}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          competition,
          competitionLabel: competitionLabel(competition, competitions),
          competitionLogoURL: competitionLogo(competition, competitions),
          unitLabel: isSerieA ? (unit ? `Matchday ${unit}` : 'Matchday TBD') : unit || 'Round TBD',
          fixtures: [],
        });
      }
      byKey.get(key).fixtures.push(f);
    }
    const groups = [...byKey.values()];
    for (const group of groups) {
      group.fixtures.sort((a, b) => {
        const dateCmp = (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99');
        if (dateCmp !== 0) return dateCmp;
        return (a.kickoffTime || '').localeCompare(b.kickoffTime || '');
      });
      group.earliestDate = group.fixtures.find((f) => f.date)?.date || '';
    }
    const competitionRank = new Map(competitionOrder.map((slug, i) => [slug, i]));
    groups.sort((a, b) => {
      const dateCmp = (a.earliestDate || '9999-99-99').localeCompare(b.earliestDate || '9999-99-99');
      if (dateCmp !== 0) return dateCmp;
      return (competitionRank.get(a.competition) ?? 0) - (competitionRank.get(b.competition) ?? 0);
    });
    return groups;
  }, [visibleFixtures, competitionOrder, competitions]);

  function guestsForFixture(fixtureId) {
    return guests.filter((g) => g.fixtureId === fixtureId && g.season === currentSeason.label);
  }

  // Shared between the date and matchday views below, which otherwise just
  // differ in how they bucket/order the same fixtures.
  function renderFixtureRow(f) {
    const expanded = expandedFixtureIds.includes(f.id);
    const fixtureGuests = guestsForFixture(f.id);
    // Only a match let in purely via the one-off override (not a real
    // team-level ticket deal) gets an undo control - computed once, shared
    // by the row's own "×" and the expanded card's "Remove access".
    const isOverrideOnly = !f.home.ticketsAvailable && Boolean(f.hospitalityOverride);
    return (
      <div key={`${f.competition}-${f.id}`} id={`hospitality-fixture-${f.competition}-${f.id}`} className="flex flex-col gap-2">
        <FixtureListRow
          fixture={f}
          expanded={expanded}
          onToggle={() => toggleExpanded(f.id)}
          guestCount={fixtureGuests.length}
          highlighted={highlightFixtureId === f.id}
          isOverrideOnly={isOverrideOnly}
          onRemoveOverride={() => handleDisableOverride(f)}
          showDate={groupBy === 'matchday'}
        />
        {expanded && (
          <MatchGuestSection
            fixture={f}
            competitions={competitions}
            clubsBySlug={clubsBySlug}
            guestSources={guestSources}
            guests={fixtureGuests}
            allGuests={guests}
            session={session}
            addGuest={addGuest}
            updateGuest={updateGuest}
            removeGuest={removeGuest}
            isOverrideOnly={isOverrideOnly}
            onRemoveOverride={() => handleDisableOverride(f)}
          />
        )}
      </div>
    );
  }

  function toggleExpanded(id) {
    setExpandedFixtureIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // "Click a fixture elsewhere in the app, land here with its guest list
  // already open" (see HospitalityLinkButton) - identified by fixture id
  // AND competition together, since ids aren't guaranteed unique across the
  // Serie A tab and every cup tab. A fixture that doesn't have hospitality
  // access yet (no standing tickets, no prior override) gets one turned on
  // automatically here - clicking the link IS the "add this match" action
  // now, there's no separate Enable control left on this page itself.
  // Forces "Show past games" on rather than leaving the very fixture just
  // clicked hidden by the default filter.
  const [searchParams] = useSearchParams();
  const linkedFixtureId = searchParams.get('fixture');
  const linkedCompetition = searchParams.get('competition');
  const [highlightFixtureId, setHighlightFixtureId] = useState(null);
  const consumedLinkRef = useRef(false);
  // Set once the linked fixture's own row needs to be scrolled to - can't
  // scroll to it immediately on enabling access, since the row (and its DOM
  // id) doesn't exist until a later render reflects the access change.
  // Checked on every render (no dependency array) until the element
  // actually exists, same approach as useFixtureSearchNav.js.
  const pendingScrollRef = useRef(null);

  useEffect(() => {
    if (!linkedFixtureId || consumedLinkRef.current || allFixtures.length === 0) return;
    const fixture = allFixtures.find((f) => String(f.id) === linkedFixtureId && f.competition === linkedCompetition);
    if (!fixture) return;
    consumedLinkRef.current = true;
    (async () => {
      if (!hasHospitalityAccess(fixture, competitions)) {
        try {
          await handleEnableOverride(fixture);
        } catch {
          // Enabling failed (network blip, auth hiccup) - nothing useful
          // to expand/scroll to, same as if the link pointed nowhere.
          return;
        }
      }
      setExpandedFixtureIds((prev) => (prev.includes(fixture.id) ? prev : [...prev, fixture.id]));
      setHighlightFixtureId(fixture.id);
      if (fixture.date && fixture.date < todayISO()) setShowPastGames(true);
      // The competition filter could otherwise hide the very fixture this
      // link points to.
      setCompetitionFilter('all');
      pendingScrollRef.current = { competition: fixture.competition, id: fixture.id };
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedFixtureId, linkedCompetition, allFixtures, competitions]);

  useEffect(() => {
    if (!pendingScrollRef.current) return;
    const { competition, id } = pendingScrollRef.current;
    const el = document.getElementById(`hospitality-fixture-${competition}-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pendingScrollRef.current = null;
    }
  });

  useEffect(() => {
    if (!highlightFixtureId) return undefined;
    const t = setTimeout(() => setHighlightFixtureId(null), 2200);
    return () => clearTimeout(t);
  }, [highlightFixtureId]);

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
          <ToggleSwitch checked={showPastGames} onChange={setShowPastGames} label="Show past games" />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        {guestsError && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200">{guestsError}</p>
        )}

        {/* Self-hiding one-off - once every legacy row's been fixed this
            never has anything to show again, so it doesn't linger as a
            permanent fixture of the page. */}
        {legacyFixes.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-100">
            <span>
              {legacyFixes.length} guest row{legacyFixes.length === 1 ? '' : 's'} still store stale internal data (club
              by name instead of slug, and/or a raw spreadsheet number for the date/kickoff) from before this was
              fixed.
            </span>
            <button
              type="button"
              onClick={handleFixLegacyRows}
              disabled={fixingLegacyRows}
              className="shrink-0 rounded-full bg-amber-400/90 px-3 py-1 font-bold text-[#0f1e54] hover:bg-amber-400 disabled:opacity-50"
            >
              {fixingLegacyRows ? 'Fixing…' : 'Fix now'}
            </button>
          </div>
        )}
        {legacyFixError && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200">{legacyFixError}</p>
        )}
        {legacyConfirmDialog}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {competitionPills.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCompetitionFilter('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  competitionFilter === 'all' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                All
              </button>
              {competitionPills.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCompetitionFilter(c.slug)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    competitionFilter === c.slug ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {c.logoURL && <img src={c.logoURL} alt="" className="h-3.5 max-w-[40px] object-contain" />}
                  {c.label}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-1 rounded-full bg-white/5 p-1">
            {[
              { value: 'date', label: 'By date' },
              { value: 'matchday', label: 'By matchday' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGroupBy(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  groupBy === opt.value ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : visibleFixtures.length === 0 ? (
          <p className="text-sm text-white/40">
            {showPastGames
              ? 'No fixtures with hospitality access yet - click a fixture’s hospitality link on the Fixtures or Cup page to add one.'
              : 'No upcoming fixtures with hospitality access - try "Show past games", or click a fixture’s hospitality link on the Fixtures or Cup page to add one.'}
          </p>
        ) : groupBy === 'matchday' ? (
          <div className="flex flex-col gap-6">
            {matchdayGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/50">
                  {group.competitionLogoURL && (
                    <img src={group.competitionLogoURL} alt="" className="h-4 max-w-[48px] object-contain" />
                  )}
                  {group.competitionLabel}
                  <span className="text-white/30">—</span>
                  {group.unitLabel}
                </h2>
                {group.fixtures.map(renderFixtureRow)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {dateGroups.map(({ date, competitionGroups }) => (
              <div key={date || 'tbd'} className="flex flex-col gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-white/50">{formatDateHeading(date)}</h2>
                {competitionGroups.map(({ slug, label, logoURL, fixtures }) => (
                  <div key={slug} className="flex flex-col gap-2">
                    <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#1fd8c9]">
                      {logoURL && <img src={logoURL} alt="" className="h-3.5 max-w-[40px] object-contain" />}
                      {label}
                    </h3>
                    {fixtures.map(renderFixtureRow)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
