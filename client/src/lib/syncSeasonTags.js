import { fetchFixtures, syncMatchTags } from './sheets.js';
import { fetchSeasonFixtures } from './seasonFixtures.js';
import { enrichFixture, applySeasonTeamAttributes } from './teams.js';

// Writes isBigMatch/isDerby to every configured season's own tab in one go -
// the live tab plus every archive tab - so a change to a season's
// sponsorship/big-club/derby designations ("Sponsorship / big match /
// derby" panel) doesn't just sit unsynced until someone happens to edit one
// of that season's rows from the app. An archive tab that doesn't exist yet
// fails just that one season rather than aborting the whole run. This
// fetches its own raw copy of every season's fixtures independently of any
// hook's already-enriched state, so the sponsored/bigClub/derby override is
// applied here unconditionally, for every season including the live one.
export async function syncAllSeasonsMatchTags({ clubsBySlug, clubsByName, teamSeasonRows, seasons }, accessToken) {
  const results = [];
  for (const season of seasons) {
    try {
      const raw = season.tab ? await fetchSeasonFixtures(season.tab) : await fetchFixtures();
      let fixtures = raw.map((r) => enrichFixture(r, clubsBySlug, clubsByName));
      fixtures = applySeasonTeamAttributes(fixtures, season.label, teamSeasonRows);
      const count = await syncMatchTags(fixtures, accessToken, season.tab ?? undefined);
      results.push({ label: season.label, ok: true, count });
    } catch (err) {
      results.push({ label: season.label, ok: false, error: err.message });
    }
  }
  return results;
}
