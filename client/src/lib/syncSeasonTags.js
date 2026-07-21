import { syncMatchTags } from './sheets.js';
import { fetchSeasonFixtures } from './seasonFixtures.js';
import { enrichFixture, applySeasonTeamAttributes } from './teams.js';
import { isSerieARow } from './competitions.js';

// Writes isBigMatch/isDerby to every configured season's own tab in one go -
// the live tab plus every archive tab - so a change to a season's
// sponsorship/big-club/derby designations ("Sponsorship / big match /
// derby" panel) doesn't just sit unsynced until someone happens to edit one
// of that season's rows from the app. An archive tab that doesn't exist yet
// fails just that one season rather than aborting the whole run. Every
// season (live included) now has a real `tab` name, so the same read-only
// fetchSeasonFixtures works for all of them - no special-casing the live one.
export async function syncAllSeasonsMatchTags({ clubsBySlug, clubsByName, teamSeasonRows, seasons }, accessToken) {
  const results = [];
  for (const season of seasons) {
    try {
      const raw = await fetchSeasonFixtures(season.tab);
      // That tab now also holds this season's cup fixtures - big-match/derby
      // tagging stays a Serie A-only concept (see CupFixtureRow), so only
      // Serie A rows get isBigMatch/isDerby computed and written back.
      let fixtures = raw.filter(isSerieARow).map((r) => enrichFixture(r, clubsBySlug, clubsByName));
      fixtures = applySeasonTeamAttributes(fixtures, season.label, teamSeasonRows);
      const count = await syncMatchTags(fixtures, accessToken, season.tab);
      results.push({ label: season.label, ok: true, count });
    } catch (err) {
      results.push({ label: season.label, ok: false, error: err.message });
    }
  }
  return results;
}
