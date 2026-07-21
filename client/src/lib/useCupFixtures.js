import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCupFixturesRaw, updateCupFixture, addCupFixture, deleteCupFixture, enrichCupFixture } from './cupFixtures.js';
import { applySeasonTeamAttributes } from './teams.js';
import { useOtherClubs } from './useOtherClubs.jsx';
import { useSeasonTeamAttributes } from './useSeasonTeamAttributes.jsx';
import { CURRENT_SEASON } from './seasons.js';

// A cup fixture predating this column reads back with a blank `season` cell
// - treated as the current season at read time only, so an old row isn't
// orphaned on first load. Every row the app writes from now on always gets
// a real label (see createFixture below), so this fallback only matters once.
function seasonLabelOf(raw) {
  return raw.season || CURRENT_SEASON.label;
}

export function useCupFixtures(teams, season) {
  const [rawFixtures, setRawFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchCupFixturesRaw()
      .then((rows) => {
        if (!cancelled) setRawFixtures(rows);
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
  }, []);

  const teamByName = useMemo(() => new Map(teams.map((t) => [t.staticName, t])), [teams]);
  const { byName: otherClubsByName } = useOtherClubs();
  const { rows: seasonAttributeRows } = useSeasonTeamAttributes();

  const isCurrent = season.label === CURRENT_SEASON.label;

  const fixtures = useMemo(() => {
    const enriched = rawFixtures
      .filter((r) => seasonLabelOf(r) === season.label)
      .map((r) => enrichCupFixture(r, teamByName, otherClubsByName));
    // Current season already carries live Settings (sponsored etc.) via the
    // team objects themselves - only a past season needs the season-scoped
    // override pass, exactly like the main Serie A archive fixtures.
    return isCurrent ? enriched : applySeasonTeamAttributes(enriched, season.label, seasonAttributeRows);
  }, [rawFixtures, teamByName, otherClubsByName, season.label, isCurrent, seasonAttributeRows]);

  const updateFixture = useCallback(async (id, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { missingFields } = await updateCupFixture(id, fields, accessToken);

    // Only reflect locally what actually reached the sheet - same reasoning
    // as the main fixtures/teams tabs: a field whose column header is
    // missing didn't save, so applying it locally would hide that failure.
    const missingHere = (missingFields ?? []).filter((f) => f in fields);
    const applied = { ...fields };
    for (const f of missingHere) delete applied[f];

    setRawFixtures((prev) => prev.map((r) => (r.id === id ? { ...r, ...applied } : r)));

    if (missingHere.length > 0) {
      throw new Error(`Saved, but the cupFixtures sheet has no column header for: ${missingHere.join(', ')}.`);
    }
  }, []);

  // Always the live season regardless of which one is currently being
  // viewed - past cup seasons are frozen (no create, no edit) once they're
  // no longer current, same as Serie A's archive tabs; backfilling an
  // already-completed cup season is a direct sheet paste (see README).
  const createFixture = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const withSeason = { ...fields, season: CURRENT_SEASON.label };
    const { id } = await addCupFixture(withSeason, accessToken);
    setRawFixtures((prev) => [...prev, { ...withSeason, id }]);
    return id;
  }, []);

  const deleteFixture = useCallback(async (id, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    await deleteCupFixture(id, accessToken);
    setRawFixtures((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { fixtures, loading, error, updateFixture, createFixture, deleteFixture };
}
