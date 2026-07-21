import { useEffect, useMemo, useState } from 'react';
import { useFixtures } from './useFixtures.js';
import { fetchSeasonFixtures } from './seasonFixtures.js';
import { enrichFixture, applySeasonTeamAttributes } from './teams.js';
import { useClubs } from './useClubs.jsx';
import { useTeamSeasons } from './useTeamSeasons.jsx';

// Switches between the live, editable current season (the same data every
// other page already reads via useFixtures) and a past season's read-only
// archive tab - one hook so a page can follow whichever season is selected
// without caring which kind it is. `canEdit` tells the caller whether to
// show any editing UI at all; updateFixture/createFixture are null for an
// archive season, never partially-wired.
export function useSeasonFixtures(season, teams) {
  // Every season has a real `tab` value now (the live one included - it's
  // renamed each rollover, e.g. fixtures_26_27), so "is this the live
  // season" is decided by the `seasons` tab's own `current` flag, not by
  // whether `tab` happens to be blank.
  const isCurrent = Boolean(season.current);

  // Always called (rules of hooks) - this is exactly what every other page
  // already fetches for the current season, so there's no extra cost when
  // that's what's being shown, and only a little unused-but-cheap fetching
  // when viewing an archive instead. `live.fixtures` already carries its own
  // season's sponsored/bigClub/derbyRival override (useFixtures.js applies
  // it internally), so the isCurrent branch below needs no override step.
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

  const { bySlug: clubsBySlug, byName: clubsByName } = useClubs();
  const { rows: teamSeasonRows } = useTeamSeasons();
  const enrichedArchive = useMemo(() => {
    const enriched = archiveFixtures.map((r) => enrichFixture(r, clubsBySlug, clubsByName));
    return applySeasonTeamAttributes(enriched, season.label, teamSeasonRows);
  }, [archiveFixtures, clubsBySlug, clubsByName, season.label, teamSeasonRows]);

  if (isCurrent) {
    return {
      fixtures: live.fixtures,
      loading: live.loading,
      error: live.error,
      canEdit: true,
      updateFixture: live.updateFixture,
      createFixture: live.createFixture,
      deleteFixture: live.deleteFixture,
    };
  }

  return {
    fixtures: enrichedArchive,
    loading: archiveLoading,
    error: archiveError,
    canEdit: false,
    updateFixture: null,
    createFixture: null,
    deleteFixture: null,
  };
}
