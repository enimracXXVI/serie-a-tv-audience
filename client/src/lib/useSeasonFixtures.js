import { useEffect, useMemo, useState } from 'react';
import { useFixtures } from './useFixtures.js';
import { fetchSeasonFixtures } from './seasonFixtures.js';
import { enrichFixture, applySeasonTeamAttributes } from './teams.js';
import { useOtherClubs } from './useOtherClubs.jsx';
import { useSeasonTeamAttributes } from './useSeasonTeamAttributes.jsx';

// Switches between the live, editable current season (the same data every
// other page already reads via useFixtures) and a past season's read-only
// archive tab - one hook so a page can follow whichever season is selected
// without caring which kind it is. `canEdit` tells the caller whether to
// show any editing UI at all; updateFixture/createFixture are null for an
// archive season, never partially-wired.
export function useSeasonFixtures(season, teams) {
  const isCurrent = !season.tab;

  // Always called (rules of hooks) - this is exactly what every other page
  // already fetches for the current season, so there's no extra cost when
  // that's what's being shown, and only a little unused-but-cheap fetching
  // when viewing an archive instead.
  const live = useFixtures([], teams);

  const [archiveFixtures, setArchiveFixtures] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(!isCurrent);
  const [archiveError, setArchiveError] = useState(null);

  useEffect(() => {
    if (isCurrent) return undefined;
    let cancelled = false;
    setArchiveLoading(true);
    setArchiveError(null);
    fetchSeasonFixtures(season.tab)
      .then((rows) => {
        if (!cancelled) setArchiveFixtures(rows);
      })
      .catch((err) => {
        if (!cancelled) setArchiveError(err.message);
      })
      .finally(() => {
        if (!cancelled) setArchiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCurrent, season.tab]);

  const teamByName = useMemo(() => new Map(teams.map((t) => [t.staticName, t])), [teams]);
  const { byName: otherClubsByName } = useOtherClubs();
  const { rows: seasonAttributeRows } = useSeasonTeamAttributes();
  const enrichedArchive = useMemo(() => {
    const enriched = archiveFixtures.map((r) => enrichFixture(r, teamByName, otherClubsByName));
    if (isCurrent) return enriched;
    return applySeasonTeamAttributes(enriched, season.label, seasonAttributeRows);
  }, [archiveFixtures, teamByName, otherClubsByName, isCurrent, season.label, seasonAttributeRows]);

  if (isCurrent) {
    return {
      fixtures: live.fixtures,
      loading: live.loading,
      error: live.error,
      canEdit: true,
      updateFixture: live.updateFixture,
      createFixture: live.createFixture,
    };
  }

  return {
    fixtures: enrichedArchive,
    loading: archiveLoading,
    error: archiveError,
    canEdit: false,
    updateFixture: null,
    createFixture: null,
  };
}
