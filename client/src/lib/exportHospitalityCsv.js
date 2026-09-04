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
];

// Guest rows store the competition as its slug, same as cup fixtures (see
// HospitalityPage) - the CSV is meant to be forwarded outside the app, so it
// needs the human name instead.
export function competitionNameForSlug(slug, competitions) {
  if (slug === SERIE_A_VALUE) return 'Serie A';
  return competitions.find((c) => c.slug === slug)?.name ?? slug;
}

function toRow(guest, competitions) {
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
  };
}

// One row per guest-per-match already (see hospitalityGuests.js) - only a
// per-row slug-to-name resolution is needed before handing off to toCSV.
export function exportHospitalityGuestsCsv(guests, filename, competitions) {
  downloadCSV(toCSV(COLUMNS, guests.map((g) => toRow(g, competitions))), filename);
}
