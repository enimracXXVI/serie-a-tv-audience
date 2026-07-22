import { createSheetTabClient } from './sheetTab.js';

// Every club the app knows about lives in one tab - the current 20-club
// Serie A roster and everyone else (a former Serie A club, a domestic cup
// opponent, a European cup opponent) alike. Same shape for all of them:
// slug, name, short, primary, secondary, crestUrl, scope - there's no
// separate "current roster" data structure anymore (see README's migration
// note for how this replaced the old bundled teams.json + teams/otherClubs
// tab split).
//
// `slug` is the row's key (not `name`) specifically so a club can be
// renamed without breaking historical fixture matching - see
// `resolveClub`/`teamsBySlug`/`teamsByName` in teams.js for how a fixture's
// home/away cell (slug for anything created after this change, name text
// for anything written before it) resolves back to a club either way.
//
// `scope` is three-valued: 'current' (playing Serie A this season - this is
// what used to be "is this club in teams.json"), 'national' (a former Serie
// A club, or a domestic-cup-only opponent), 'european' (a continental-only
// opponent). Used to decide which clubs are offered as cup-fixture
// opponents for a given competition (see AddCupFixtureForm.jsx) and to
// group the Settings panel into three sections.
const client = createSheetTabClient({
  sheetName: 'teams',
  idField: 'slug',
  autoIncrementId: false,
  bookkeepingIdField: 'id',
  imageFormulaFields: ['crestUrl'],
});

export const fetchClubs = client.fetchAll;
export const updateClub = client.updateRow;
export const addClub = client.appendRow;
export const deleteClub = client.deleteRow;

// A club row created before `scope` existed (or hand-typed without it)
// reads back with a blank cell - treated as 'national' at read time only,
// same tolerant-default convention as competitions.js's competitionScope().
export function clubScope(club) {
  if (club?.scope === 'current') return 'current';
  if (club?.scope === 'european') return 'european';
  return 'national';
}

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
