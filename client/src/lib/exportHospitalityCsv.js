import { toCSV, downloadCSV, csvText } from './csv.js';
import { SERIE_A_VALUE } from './competitions.js';
import { isoToDDMMYYYY } from './dateFormat.js';

const COLUMNS = [
  { key: 'competition', label: 'Competition' },
  { key: 'matchdayOrRound', label: 'Matchday/Round' },
  { key: 'date', label: 'Date' },
  { key: 'kickoff', label: 'Kickoff' },
  { key: 'match', label: 'Match' },
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'dob', label: 'Date of birth' },
  { key: 'nationOfBirth', label: 'Nation of birth' },
  { key: 'cityOfBirth', label: 'City of birth' },
  { key: 'provinceOfBirth', label: 'Province of birth' },
  { key: 'nationOfResidence', label: 'Nation of residence' },
  { key: 'cityOfResidence', label: 'City of residence' },
  { key: 'provinceOfResidence', label: 'Province of residence' },
  { key: 'source', label: 'Source' },
  { key: 'instagramHandle', label: 'Instagram handle' },
  { key: 'email', label: 'Email' },
];

// Guest rows store the competition as its slug, same as cup fixtures (see
// HospitalityPage) - the CSV is meant to be forwarded outside the app, so it
// needs the human name instead.
export function competitionNameForSlug(slug, competitions) {
  if (slug === SERIE_A_VALUE) return 'Serie A';
  return competitions.find((c) => c.slug === slug)?.name ?? slug;
}

// Same slug-to-name resolution, for the `source` column (see
// GuestSourcesPanel/guestSources.js) - blank rather than the raw slug if the
// category was since renamed or deleted.
function sourceNameForSlug(slug, guestSources) {
  if (!slug) return '';
  return guestSources.find((s) => s.slug === slug)?.name ?? slug;
}

function toRow(guest, competitions, guestSources) {
  return {
    competition: competitionNameForSlug(guest.competition, competitions),
    matchdayOrRound: guest.matchday || guest.round || '',
    // Day-first (DD/MM/YYYY), not the ISO order the sheet stores - matches
    // every day-first site this data gets copy-pasted into. Also wrapped in
    // csvText: Excel/Sheets still auto-detect a bare date/time-shaped CSV
    // field on import and reformat the cell to its own serial number -
    // sometimes landing on "General" format afterwards, which then displays
    // as a raw decimal instead of a readable date/time.
    date: csvText(isoToDDMMYYYY(guest.matchDate)),
    kickoff: csvText(guest.kickoffTime),
    match: `${guest.homeTeam} v ${guest.awayTeam}`,
    firstName: guest.firstName,
    lastName: guest.lastName,
    dob: csvText(isoToDDMMYYYY(guest.dateOfBirth)),
    nationOfBirth: guest.nationOfBirth,
    cityOfBirth: guest.cityOfBirth,
    provinceOfBirth: guest.provinceOfBirth,
    nationOfResidence: guest.nationOfResidence,
    cityOfResidence: guest.cityOfResidence,
    provinceOfResidence: guest.provinceOfResidence,
    source: sourceNameForSlug(guest.source, guestSources),
    // Plain "handle" text, not a link - the CSV is opened in all sorts of
    // programs, and clicking through to Instagram only matters on-screen in
    // the app itself (see GuestRow).
    instagramHandle: guest.instagramHandle ? `@${guest.instagramHandle}` : '',
    email: guest.email,
  };
}

// One row per guest-per-match already (see hospitalityGuests.js) - only a
// per-row slug-to-name resolution is needed before handing off to toCSV.
export function exportHospitalityGuestsCsv(guests, filename, competitions, guestSources) {
  downloadCSV(toCSV(COLUMNS, guests.map((g) => toRow(g, competitions, guestSources))), filename);
}
