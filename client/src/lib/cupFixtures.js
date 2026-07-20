import { createSheetTabClient } from './sheetTab.js';

const client = createSheetTabClient({
  sheetName: 'cupFixtures',
  idField: 'id',
  autoIncrementId: true,
  numericFields: ['id', 'ourScore', 'theirScore', 'audience', 'addedTime1H', 'addedTime2H'],
});

export const fetchCupFixturesRaw = client.fetchAll;
export const updateCupFixture = client.updateRow;
export const addCupFixture = client.appendRow;

export function isCupFixturePlayed(fixture) {
  return fixture.ourScore !== null && fixture.ourScore !== undefined && fixture.theirScore !== null && fixture.theirScore !== undefined;
}

// A stand-in so a row always has something Crest-safe to render even before
// its opponent has been added to the cupTeams roster, or if "ourClub" points
// at a slug that's since been renamed/removed from the main teams tab.
function fallbackTeam(slug, name) {
  return { slug, name: name ?? slug ?? 'Unknown', short: (name ?? slug ?? '???').slice(0, 3).toUpperCase(), crestUrl: null, primary: '#94a3b8', secondary: '#ffffff' };
}

// Resolves the raw sheet row's ourClub/opponent slugs into full team-like
// objects (crest, colours) from the two different rosters they each come
// from, and derives home/away from homeAway so display code can treat this
// the same way it treats a main-fixtures row.
export function enrichCupFixture(raw, teamsBySlug, cupTeamsBySlug) {
  const ourClub = teamsBySlug.get(raw.ourClub) ?? fallbackTeam(raw.ourClub);
  const opponent = cupTeamsBySlug.get(raw.opponent) ?? fallbackTeam(raw.opponent, raw.opponent);
  const isHome = raw.homeAway !== 'away';
  return {
    ...raw,
    ourClub,
    opponent,
    home: isHome ? ourClub : opponent,
    away: isHome ? opponent : ourClub,
  };
}
