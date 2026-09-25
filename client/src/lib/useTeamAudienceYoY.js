import { useEffect, useMemo, useState } from 'react';
import { fetchSeasonFixtures } from './seasonFixtures.js';
import { enrichFixture, teamsInFixtures, applySeasonTeamAttributes } from './teams.js';
import { isSerieARow } from './competitions.js';
import { useClubs } from './useClubs.jsx';
import { useTeamSeasons } from './useTeamSeasons.jsx';
import { useSeasons } from './useSeasons.jsx';
import { computeAllTeamMetrics, computeTeamYoY, filterUpToMatchday } from './dashboardMetrics.js';

// The season immediately before `season` by label, not by whatever order the
// sheet happens to list them in - season labels are "YY/YY" (e.g. "25/26"),
// which sorts correctly as plain strings for as long as this app is likely
// to be in use. Returns null if `season` is the earliest one on record.
function findPreviousSeason(seasons, season) {
  const sorted = [...seasons].sort((a, b) => b.label.localeCompare(a.label));
  const index = sorted.findIndex((s) => s.label === season.label);
  if (index === -1 || index === sorted.length - 1) return null;
  return sorted[index + 1];
}

// Only fetches the ONE season right before the current one - not every
// season on record like useSeasonComparison does for its own full history
// view, since this only ever needs a single YoY pair. `matchday` (the
// slider's current position, never above the furthest matchday actually
// played this season) caps BOTH sides of the comparison - comparing a
// partial season against a prior season's full 38 rounds would understate
// this season's pace, and letting the slider go lower lets an early-season
// trend be read on its own before the year drags it back to the mean.
export function useTeamAudienceYoY(season, fixtures, effectiveTeams, includeSimulcast, includeOther, matchday) {
  const { seasons } = useSeasons();
  const previousSeason = useMemo(() => findPreviousSeason(seasons, season), [seasons, season]);

  const [previousRows, setPreviousRows] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(previousSeason));

  const { bySlug: clubsBySlug, byName: clubsByName } = useClubs();
  const { rows: teamSeasonRows } = useTeamSeasons();

  useEffect(() => {
    if (!previousSeason) {
      setPreviousRows(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSeasonFixtures(previousSeason.tab)
      .then((rows) => {
        if (!cancelled) setPreviousRows(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previousSeason]);

  const currentMetrics = useMemo(
    () => computeAllTeamMetrics(effectiveTeams, filterUpToMatchday(fixtures, matchday), includeSimulcast, includeOther),
    [effectiveTeams, fixtures, matchday, includeSimulcast, includeOther]
  );

  const rows = useMemo(() => {
    if (!previousSeason || !previousRows || matchday == null) return [];
    const previousFixtures = applySeasonTeamAttributes(
      // The archive tab now also holds that season's cup fixtures - filter
      // to Serie A rows only, same as useSeasonComparison. Also capped to
      // the slider's matchday, so a partial season is never compared against
      // more of the prior season than it's actually played through.
      previousRows
        .filter(isSerieARow)
        .filter((r) => r.matchday != null && r.matchday <= matchday)
        .map((r) => enrichFixture(r, clubsBySlug, clubsByName)),
      previousSeason.label,
      teamSeasonRows
    );
    if (previousFixtures.length === 0) return [];
    const previousMetrics = computeAllTeamMetrics(
      teamsInFixtures(previousFixtures),
      previousFixtures,
      includeSimulcast,
      includeOther
    );
    // A club promoted/relegated since, or one that simply hasn't played its
    // home leg yet within this matchday range, has nothing real to compare -
    // showing it as a dash row is just noise, so it's dropped rather than
    // displayed.
    return computeTeamYoY(currentMetrics, previousMetrics).filter(
      (r) => r.currentAvg !== null && r.previousAvg !== null
    );
  }, [previousSeason, previousRows, matchday, clubsBySlug, clubsByName, teamSeasonRows, currentMetrics, includeSimulcast, includeOther]);

  return { previousSeason, rows, loading, error };
}
