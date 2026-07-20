import { createSheetTabClient } from './sheetTab.js';

// Per-(season, club) overrides for sponsored/bigClub/derbyRival - the "teams"
// tab's equivalent fields are global/current-only, so a past season needs its
// own row rather than inheriting whatever today's Settings say. Absence of a
// row means false/null for that season - there's deliberately no fallback to
// the live "teams" tab, since a club must not appear sponsored/big/derby in a
// past season just because it happens to be that today.
const client = createSheetTabClient({
  sheetName: 'seasonTeamAttributes',
  idField: 'id',
  autoIncrementId: false,
  booleanFields: ['sponsored', 'bigClub'],
});

export const fetchSeasonTeamAttributes = client.fetchAll;
export const updateSeasonTeamAttribute = client.updateRow;
export const createSeasonTeamAttribute = client.appendRow;

// `derbyRival` is stored as a name (never a slug) - a current-roster club's
// real slug is arbitrary and not guaranteed to equal a slugified name, while
// a non-roster club's only slug IS its slugified name, so name is the one
// key both cases can always agree on. Resolved to an actual slug only at
// apply time, against that season's own real roster (see teams.js's
// applySeasonTeamAttributes).
export function makeId(season, name) {
  return `${season}::${name}`;
}
