import { useEffect, useMemo, useState } from 'react';
import { useFixtures } from './useFixtures.js';
import { fetchSeasonFixtures } from './seasonFixtures.js';
import { enrichFixture, teamsInFixtures, applySeasonTeamAttributes } from './teams.js';
import { isSerieARow } from './competitions.js';
import { useClubs } from './useClubs.jsx';
import { useTeamSeasons } from './useTeamSeasons.jsx';
import { computeAllTeamMetrics, filterUpToMatchday } from './dashboardMetrics.js';
import { useSeasons } from './useSeasons.jsx';

function delta(currentValue, previousValue) {
  if (currentValue === null || currentValue === undefined || previousValue === null || previousValue === undefined) {
    return { delta: null, deltaPct: null };
  }
  const d = currentValue - previousValue;
  return { delta: d, deltaPct: previousValue ? (d / previousValue) * 100 : null };
}

// Summary-level, season-by-season comparison (league-wide total audience and
// home avg, plus a focused club's own home avg and total audience) -
// deliberately not a full re-run of every Dashboard metric for every season,
// just these few headline numbers, computed by calling the exact same
// computeAllTeamMetrics used for the current season's own cards, once per
// season. `matchdayCap` (from the card's own slider, never above the
// furthest matchday the CURRENT season has actually reached) is applied to
// every season alike - without it, a partial current season would sit next
// to archive seasons' full 38-round figures, making the bars incomparable at
// a glance.
export function useSeasonComparison(teams, includeSimulcast, includeOther, focusedSlug, matchdayCap) {
  const live = useFixtures([], teams);
  const { seasons } = useSeasons();
  // Every season has a real `tab` now (the live one included), so archive
  // vs. live is decided by the `current` flag, not by whether `tab` is set.
  const archiveSeasons = useMemo(() => seasons.filter((s) => !s.current), [seasons]);
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

  const { bySlug: clubsBySlug, byName: clubsByName } = useClubs();
  const { rows: teamSeasonRows } = useTeamSeasons();

  const seasonSummaries = useMemo(() => {
    const base = seasons.map((s) => {
      const isCurrent = Boolean(s.current);
      const rawFixtures = isCurrent
        ? live.fixtures
        : applySeasonTeamAttributes(
            // The archive tab now also holds that season's cup fixtures -
            // filter to Serie A rows only.
            (archiveRows[s.tab] ?? []).filter(isSerieARow).map((r) => enrichFixture(r, clubsBySlug, clubsByName)),
            s.label,
            teamSeasonRows
          );
      const fixtures = filterUpToMatchday(rawFixtures, matchdayCap);
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

    // Season-on-season variance vs whichever season comes immediately before
    // it in time - `seasons` itself leads with the current season and isn't
    // chronologically sorted after that, so this re-sorts by label just to
    // find each row's real predecessor, then attaches the delta back onto
    // the original (display-order) rows.
    const chronological = [...base].sort((a, b) => a.label.localeCompare(b.label));
    const deltasByLabel = new Map();
    chronological.forEach((s, i) => {
      const prev = i > 0 ? chronological[i - 1] : null;
      if (!prev || s.loading || s.error || prev.loading || prev.error) return;
      deltasByLabel.set(s.label, {
        totalAudience: delta(s.totalAudience, prev.totalAudience),
        leagueAvg: delta(s.leagueAvg, prev.leagueAvg),
        focusedAvg: delta(s.focusedAvg, prev.focusedAvg),
        focusedTotal: delta(s.focusedTotal, prev.focusedTotal),
      });
    });

    return base.map((s) => ({ ...s, deltas: deltasByLabel.get(s.label) ?? null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    seasons,
    live.fixtures,
    live.loading,
    live.error,
    archiveRows,
    archiveLoading,
    archiveErrors,
    clubsBySlug,
    clubsByName,
    teamSeasonRows,
    teams,
    includeSimulcast,
    includeOther,
    focusedSlug,
    matchdayCap,
  ]);

  return { seasons: seasonSummaries, loading: live.loading || archiveLoading };
}
