import { createSheetTabClient } from './sheetTab.js';

// value is the stable key used everywhere else (cupTeams.competition,
// cupFixtures.competition) - not auto-incrementing, and not meant to be
// renamed once fixtures/teams reference it. label and logoUrl are the only
// things Settings actually edits day to day.
const client = createSheetTabClient({ sheetName: 'competitions', idField: 'value', autoIncrementId: false });

export const fetchCompetitions = client.fetchAll;
export const updateCompetition = client.updateRow;
export const addCompetition = client.appendRow;

// Used only if the "competitions" tab hasn't been set up yet (or is
// temporarily empty), so the rest of the app - the Add fixture form, the
// Cup competitions page - still has somewhere to group fixtures.
//
// `scope` ('national' | 'european') decides which otherClubs are offered as
// opponents for a competition (see AddCupFixtureForm) - domestic cups only
// ever face a national club, continental cups only a European one.
export const DEFAULT_COMPETITIONS = [
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
