import { fetchFixtures } from './sheets.js';
import { fetchClubs } from './clubs.js';
import { fetchCompetitions, isSerieARow } from './competitions.js';
import { fetchBroadcasters, resolveBroadcaster, resolveBroadcasterList } from './broadcasters.js';
import { resolveClub } from './teams.js';
import { toCSV, downloadCSV, csvText } from './csv.js';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'matchday', label: 'Matchday' },
  { key: 'round', label: 'Round' },
  { key: 'competition', label: 'Competition' },
  { key: 'date', label: 'Date' },
  { key: 'day', label: 'Day' },
  { key: 'kickoffTime', label: 'Kickoff' },
  { key: 'home', label: 'Home' },
  { key: 'away', label: 'Away' },
  { key: 'homeScore', label: 'Home score' },
  { key: 'awayScore', label: 'Away score' },
  { key: 'etHomeScore', label: 'ET home score' },
  { key: 'etAwayScore', label: 'ET away score' },
  { key: 'penHomeScore', label: 'Pen home score' },
  { key: 'penAwayScore', label: 'Pen away score' },
  { key: 'neutralVenue', label: 'Neutral venue' },
  // A cup fixture's audience is in `mainAudience` too, same column a Serie A
  // row uses - there's no separate cup-only audience column.
  { key: 'mainAudience', label: 'Main audience' },
  { key: 'otherAudience', label: 'Other audience' },
  { key: 'simulcastAudience', label: 'Simulcast audience' },
  { key: 'otherBroadcaster', label: 'Other broadcaster' },
  { key: 'addedTime1H', label: 'Added time 1H' },
  { key: 'addedTime2H', label: 'Added time 2H' },
  { key: 'extraLedMinutes', label: 'Extra LED minutes' },
  { key: 'isBigMatch', label: 'Big match' },
  { key: 'isDerby', label: 'Derby' },
  { key: 'updatedAt', label: 'Updated at' },
];

// A cup fixture's `otherBroadcaster` cell can hold a comma-separated list
// (see resolveBroadcasterList) while a Serie A row only ever holds one -
// this handles either shape and always resolves back to display names
// rather than raw slugs.
function resolveBroadcasterDisplay(raw, broadcasters) {
  if (!raw) return '';
  if (raw.includes(',')) {
    return resolveBroadcasterList(raw, broadcasters)
      .map(({ broadcaster, fallbackName }) => broadcaster?.name || fallbackName)
      .join('; ');
  }
  return resolveBroadcaster(raw, broadcasters)?.name || raw;
}

// `kind`: 'serie-a' | 'cup' | 'all'. Serie A and cup fixtures for a season
// live in the very same sheet tab (see sheets.js) - isSerieARow is what
// tells the two apart, same as everywhere else in the app that needs to.
export async function exportFixturesCsv({ season, kind }) {
  const [raw, clubs, competitions, broadcasters] = await Promise.all([
    fetchFixtures(season.tab),
    fetchClubs(),
    fetchCompetitions(),
    fetchBroadcasters(),
  ]);

  const clubsBySlug = new Map(clubs.map((c) => [c.slug, c]));
  const clubsByName = new Map(clubs.map((c) => [c.name, c]));
  const competitionsBySlug = new Map(competitions.map((c) => [c.slug, c]));

  const filtered =
    kind === 'serie-a' ? raw.filter(isSerieARow) : kind === 'cup' ? raw.filter((f) => !isSerieARow(f)) : raw;

  const rows = filtered.map((f) => ({
    id: f.id,
    matchday: f.matchday ?? '',
    round: f.round ?? '',
    competition: isSerieARow(f) ? 'Serie A' : competitionsBySlug.get(f.competition)?.name ?? f.competition,
    // See csvText - a bare date/kickoff string otherwise gets auto-detected
    // and reformatted (sometimes into a raw serial number) by Excel/Sheets
    // on import.
    date: csvText(f.date),
    day: f.day ?? '',
    kickoffTime: csvText(f.kickoffTime),
    home: resolveClub(f.home, clubsBySlug, clubsByName).name,
    away: resolveClub(f.away, clubsBySlug, clubsByName).name,
    homeScore: f.homeScore ?? '',
    awayScore: f.awayScore ?? '',
    etHomeScore: f.etHomeScore ?? '',
    etAwayScore: f.etAwayScore ?? '',
    penHomeScore: f.penHomeScore ?? '',
    penAwayScore: f.penAwayScore ?? '',
    neutralVenue: f.neutralVenue ?? '',
    mainAudience: f.mainAudience ?? '',
    otherAudience: f.otherAudience ?? '',
    simulcastAudience: f.simulcastAudience ?? '',
    otherBroadcaster: resolveBroadcasterDisplay(f.otherBroadcaster, broadcasters),
    addedTime1H: f.addedTime1H ?? '',
    addedTime2H: f.addedTime2H ?? '',
    extraLedMinutes: f.extraLedMinutes ?? '',
    isBigMatch: f.isBigMatch ?? '',
    isDerby: f.isDerby ?? '',
    updatedAt: f.updatedAt ?? '',
  }));

  const kindLabel = kind === 'serie-a' ? 'serie-a-fixtures' : kind === 'cup' ? 'cup-fixtures' : 'all-fixtures';
  downloadCSV(toCSV(COLUMNS, rows), `${kindLabel}-${season.label.replace('/', '-')}.csv`);
}
