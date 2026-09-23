import { useEffect, useMemo, useState } from 'react';
import { fetchSeasonFixtures } from './seasonFixtures.js';
import { enrichFixture, teamsInFixtures, applySeasonTeamAttributes } from './teams.js';
import { isSerieARow } from './competitions.js';
import { useClubs } from './useClubs.jsx';
import { useTeamSeasons } from './useTeamSeasons.jsx';
import { useSeasons } from './useSeasons.jsx';
import { computeAllTeamMetrics, computeTeamYoY } from './dashboardMetrics.js';

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

// Reuses the currently-viewed season's own already-computed `currentMetrics`
// (DashboardPage has these anyway) and only fetches the ONE season right
// before it - not every season on record like useSeasonComparison does for
// its own full history view, since this only ever needs a single YoY pair.
export function useTeamAudienceYoY(season, currentMetrics, includeSimulcast, includeOther) {
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

  const rows = useMemo(() => {
    if (!previousSeason || !previousRows) return [];
    const fixtures = applySeasonTeamAttributes(
      // The archive tab now also holds that season's cup fixtures - filter
      // to Serie A rows only, same as useSeasonComparison.
      previousRows.filter(isSerieARow).map((r) => enrichFixture(r, clubsBySlug, clubsByName)),
      previousSeason.label,
      teamSeasonRows
    );
    if (fixtures.length === 0) return [];
    const previousMetrics = computeAllTeamMetrics(teamsInFixtures(fixtures), fixtures, includeSimulcast, includeOther);
    return computeTeamYoY(currentMetrics, previousMetrics);
  }, [previousSeason, previousRows, clubsBySlug, clubsByName, teamSeasonRows, currentMetrics, includeSimulcast, includeOther]);

  return { previousSeason, rows, loading, error };
}
