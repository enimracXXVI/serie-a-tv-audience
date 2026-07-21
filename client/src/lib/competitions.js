import { createSheetTabClient } from './sheetTab.js';

// value is the stable key used everywhere else (cupTeams.competition,
// cupFixtures.competition) - not auto-incrementing, and not meant to be
// renamed once fixtures/teams reference it. label and logoUrl are the only
// things Settings actually edits day to day.
const client = createSheetTabClient({ sheetName: 'competitions', idField: 'value', autoIncrementId: false });

export const fetchCompetitions = client.fetchAll;
export const updateCompetition = client.updateRow;
export const addCompetition = client.appendRow;

// Serie A itself is a row here too now (not a cup, never has fixtures of
// its own in cupFixtures) - purely so its logo setting can live in the same
// tab/section as every other competition's, instead of a separate
// single-purpose `appSettings` tab just for one field. Excluded from the
// cup-fixture competition picker (see AddCupFixtureForm) since you can't
// "add a cup fixture" under Serie A.
export const SERIE_A_VALUE = 'serie-a';

// Used only if the "competitions" tab hasn't been set up yet (or is
// temporarily empty), so the rest of the app - the Add fixture form, the
// Cup competitions page - still has somewhere to group fixtures.
//
// `scope` ('national' | 'european') decides which clubs are offered as
// opponents for a competition (see AddCupFixtureForm) - domestic cups only
// ever face a national club, continental cups only a European one.
export const DEFAULT_COMPETITIONS = [
  { value: SERIE_A_VALUE, label: 'Serie A', logoUrl: '', scope: 'national' },
  { value: 'CoppaItalia', label: 'Coppa Italia', logoUrl: '', scope: 'national' },
  { value: 'ChampionsLeague', label: 'Champions League', logoUrl: '', scope: 'european' },
  { value: 'EuropaLeague', label: 'Europa League', logoUrl: '', scope: 'european' },
  { value: 'ConferenceLeague', label: 'Conference League', logoUrl: '', scope: 'european' },
];

// A competitions row created before this field existed (or hand-typed
// without it) reads back with a blank scope cell - treated as national at
// read time only, since that was every competition's only meaning before
// this field existed.
export function competitionScope(competition) {
  return competition?.scope === 'european' ? 'european' : 'national';
}

// Shown next to the page title on Fixtures/Standings headers - Serie A's
// own logoUrl, read straight off its `competitions` row.
export function serieALogo(competitions) {
  return competitions.find((c) => c.value === SERIE_A_VALUE)?.logoUrl || '';
}
