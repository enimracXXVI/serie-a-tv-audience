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
export const DEFAULT_COMPETITIONS = [
  { value: 'CoppaItalia', label: 'Coppa Italia', logoUrl: '' },
  { value: 'ChampionsLeague', label: 'Champions League', logoUrl: '' },
  { value: 'EuropaLeague', label: 'Europa League', logoUrl: '' },
  { value: 'ConferenceLeague', label: 'Conference League', logoUrl: '' },
];
