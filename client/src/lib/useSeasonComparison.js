import { useEffect, useMemo, useState } from 'react';
import { useFixtures } from './useFixtures.js';
import { fetchSeasonFixtures } from './seasonFixtures.js';
import { enrichFixture, teamsInFixtures, applySeasonTeamAttributes } from './teams.js';
import { useOtherClubs } from './useOtherClubs.jsx';
import { useSeasonTeamAttributes } from './useSeasonTeamAttributes.jsx';
import { computeAllTeamMetrics } from './dashboardMetrics.js';
import { SEASONS } from './seasons.js';

// Summary-level, season-by-season comparison (league-wide total audience and
// home avg, plus a focused club's own home avg and total audience) -
// deliberately not a full re-run of every Dashboard metric for every season,
// just these few headline numbers, computed by calling the exact same
// computeAllTeamMetrics used for the current season's own cards, once per
// season.
export function useSeasonComparison(teams, includeSimulcast, includeOther, focusedSlug) {
  const live = useFixtures([], teams);
  const archiveSeasons = useMemo(() => SEASONS.filter((s) => s.tab), []);
  const [archiveRows, setArchiveRows] = useState({});
  const [archiveErrors, setArchiveErrors] = useState({});
  const [archiveLoading, setArchiveLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      archiveSeasons.map((s) =>
        fetchSeasonFixtures(s.tab)
          .then((rows) => ({ tab: s.tab, rows }))
          .catch((err) => ({ tab: s.tab, error: err.message }))
      )
    ).then((results) => {
      if (cancelled) return;
      const rows = {};
      const errors = {};
      for (const r of results) {
        if (r.error) errors[r.tab] = r.error;
        else rows[r.tab] = r.rows;
      }
      setArchiveRows(rows);
      setArchiveErrors(errors);
      setArchiveLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [archiveSeasons]);

  const teamByName = useMemo(() => new Map(teams.map((t) => [t.staticName, t])), [teams]);
  const { byName: otherClubsByName } = useOtherClubs();
  const { rows: seasonAttributeRows } = useSeasonTeamAttributes();

  const seasons = useMemo(() => {
    return SEASONS.map((s) => {
      const isCurrent = !s.tab;
      const fixtures = isCurrent
        ? live.fixtures
        : applySeasonTeamAttributes(
            (archiveRows[s.tab] ?? []).map((r) => enrichFixture(r, teamByName, otherClubsByName)),
            s.label,
            seasonAttributeRows
          );
      const loading = isCurrent ? live.loading : archiveLoading;
      const error = isCurrent ? live.error : (archiveErrors[s.tab] ?? null);

      if (loading || error || fixtures.length === 0) {
        return {
          label: s.label,
          loading,
          error,
          totalAudience: 0,
          leagueAvg: 0,
          focusedAvg: null,
          focusedTotal: null,
        };
      }

      // The current 20-club roster isn't necessarily who played that season -
      // relegated/promoted clubs since then would otherwise be silently
      // excluded from that season's totals. For an archive season, compute
      // metrics over every club that actually appears in ITS fixtures
      // (current roster ones keep their real team record; others use the
      // synthetic fallback teams.js's enrichFixture gives them).
      const seasonTeams = isCurrent ? teams : teamsInFixtures(fixtures);

      const metrics = computeAllTeamMetrics(seasonTeams, fixtures, includeSimulcast, includeOther);
      const withHomeGames = metrics.filter((m) => m.homeGamesPlayed > 0);
      const totalAudience = metrics.reduce((a, m) => a + m.homeAudienceTotal, 0);
      const leagueAvg = withHomeGames.length
        ? withHomeGames.reduce((a, m) => a + m.homeAudienceAvg, 0) / withHomeGames.length
        : 0;
      const focusedMetric = focusedSlug ? metrics.find((m) => m.team.slug === focusedSlug) : null;

      return {
        label: s.label,
        loading: false,
        error: null,
        totalAudience,
        leagueAvg,
        focusedAvg: focusedMetric && focusedMetric.homeGamesPlayed > 0 ? focusedMetric.homeAudienceAvg : null,
        focusedTotal: focusedMetric && focusedMetric.totalGamesPlayed > 0 ? focusedMetric.totalAudienceTotal : null,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    live.fixtures,
    live.loading,
    live.error,
    archiveRows,
    archiveLoading,
    archiveErrors,
    teamByName,
    otherClubsByName,
    seasonAttributeRows,
    teams,
    includeSimulcast,
    includeOther,
    focusedSlug,
  ]);

  return { seasons, loading: live.loading || archiveLoading };
}
