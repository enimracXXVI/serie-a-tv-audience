import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCupFixturesRaw, updateCupFixture, addCupFixture, enrichCupFixture } from './cupFixtures.js';

export function useCupFixtures(teams, cupTeams) {
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

  const teamsBySlug = useMemo(() => new Map(teams.map((t) => [t.slug, t])), [teams]);
  const cupTeamsBySlug = useMemo(() => new Map(cupTeams.map((t) => [t.slug, t])), [cupTeams]);

  const fixtures = useMemo(
    () => rawFixtures.map((r) => enrichCupFixture(r, teamsBySlug, cupTeamsBySlug)),
    [rawFixtures, teamsBySlug, cupTeamsBySlug]
  );

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

  const createFixture = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { id } = await addCupFixture(fields, accessToken);
    setRawFixtures((prev) => [...prev, { ...fields, id }]);
    return id;
  }, []);

  return { fixtures, loading, error, updateFixture, createFixture };
}
