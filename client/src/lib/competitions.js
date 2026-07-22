import { createSheetTabClient } from './sheetTab.js';

// `slug` is the stable key used everywhere else (cupFixtures rows'
// `competition` cell) - not auto-incrementing, and not meant to be renamed
// once fixtures reference it. `name` and `logoURL` are the things Settings
// actually edits day to day; `long`/`short` exist on the sheet (same
// convention as the `teams` tab) but aren't read anywhere yet.
const client = createSheetTabClient({
  sheetName: 'competitions',
  idField: 'slug',
  autoIncrementId: false,
  bookkeepingIdField: 'id',
});

export const fetchCompetitions = client.fetchAll;
export const updateCompetition = client.updateRow;
export const addCompetition = client.appendRow;

// Serie A itself is a row here too now (not a cup, never has fixtures of
// its own of its own kind) - purely so its logo setting can live in the same
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
  { slug: SERIE_A_VALUE, name: 'Serie A', logoURL: '', scope: 'national' },
  { slug: 'CoppaItalia', name: 'Coppa Italia', logoURL: '', scope: 'national' },
  { slug: 'ChampionsLeague', name: 'Champions League', logoURL: '', scope: 'european' },
  { slug: 'EuropaLeague', name: 'Europa League', logoURL: '', scope: 'european' },
  { slug: 'ConferenceLeague', name: 'Conference League', logoURL: '', scope: 'european' },
];

// A competitions row created before this field existed (or hand-typed
// without it) reads back with a blank scope cell - treated as national at
// read time only, since that was every competition's only meaning before
// this field existed.
export function competitionScope(competition) {
  return competition?.scope === 'european' ? 'european' : 'national';
}

// Shown next to the page title on Fixtures/Standings headers - Serie A's
// own logoURL, read straight off its `competitions` row.
export function serieALogo(competitions) {
  return competitions.find((c) => c.slug === SERIE_A_VALUE)?.logoURL || '';
}

// Cup fixtures now live in the very same per-season fixtures tab as Serie A
// rows (see sheets.js) - this one column tells them apart. A row with no
// `competition` cell (every Serie A row written before this merge) or the
// Serie A sentinel itself is a Serie A fixture; anything else is a cup
// fixture's actual competition value.
export function isSerieARow(raw) {
  return !raw.competition || raw.competition === SERIE_A_VALUE;
}
