import { fetchFixtures, syncMatchTags } from './sheets.js';
import { fetchSeasonFixtures } from './seasonFixtures.js';
import { enrichFixture, applySeasonTeamAttributes } from './teams.js';
import { SEASONS } from './seasons.js';

// Writes isBigMatch/isDerby to every configured season's own tab in one go -
// the live tab plus every archive tab - so a change to a past season's
// sponsorship/big-club/derby designations (Settings' "Past-season
// sponsorship / big match / derby" panel) doesn't just sit unsynced until
// someone happens to edit one of that season's rows from the app. An
// archive tab that doesn't exist yet fails just that one season rather than
// aborting the whole run.
export async function syncAllSeasonsMatchTags({ teamByName, pastTeamsByName, seasonAttributeRows }, accessToken) {
  const results = [];
  for (const season of SEASONS) {
    try {
      const raw = season.tab ? await fetchSeasonFixtures(season.tab) : await fetchFixtures();
      let fixtures = raw.map((r) => enrichFixture(r, teamByName, pastTeamsByName));
      if (season.tab) fixtures = applySeasonTeamAttributes(fixtures, season.label, seasonAttributeRows);
      const count = await syncMatchTags(fixtures, accessToken, season.tab ?? undefined);
      results.push({ label: season.label, ok: true, count });
    } catch (err) {
      results.push({ label: season.label, ok: false, error: err.message });
    }
  }
  return results;
}
