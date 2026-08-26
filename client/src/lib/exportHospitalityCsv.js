import { toCSV, downloadCSV } from './csv.js';

const COLUMNS = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'nationOfBirth', label: 'Nation of birth' },
  { key: 'provinceOfBirth', label: 'Province of birth' },
  { key: 'cityOfBirth', label: 'City of birth' },
  { key: 'nationOfResidence', label: 'Nation of residence' },
  { key: 'provinceOfResidence', label: 'Province of residence' },
  { key: 'cityOfResidence', label: 'City of residence' },
  { key: 'competition', label: 'Competition' },
  { key: 'matchday', label: 'Matchday' },
  { key: 'round', label: 'Round' },
  { key: 'homeTeam', label: 'Home team' },
  { key: 'awayTeam', label: 'Away team' },
  { key: 'matchDate', label: 'Date' },
  { key: 'kickoffTime', label: 'Kickoff' },
  { key: 'addedBy', label: 'Added by' },
];

// One row per guest-per-match already (see hospitalityGuests.js) - the CSV
// is just those rows as-is, ready to forward by email without any joins.
export function exportHospitalityGuestsCsv(guests, filename) {
  downloadCSV(toCSV(COLUMNS, guests), filename);
}
