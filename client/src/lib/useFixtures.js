import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFixtures, updateFixtureRow } from './sheets.js';
import { enrichFixture } from './teams.js';

export function useFixtures(teamSlugs, teams) {
  const [rawFixtures, setRawFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const key = teamSlugs.slice().sort().join(',');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFixtures()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Keyed by each club's immutable bundled name, not its current (possibly
  // renamed) display name - see teams.js's enrichFixture.
  const teamByName = useMemo(() => new Map(teams.map((t) => [t.staticName, t])), [teams]);

  const fixtures = useMemo(() => {
    let enriched = rawFixtures.map((r) => enrichFixture(r, teamByName));
    if (teamSlugs.length > 0) {
      const wanted = new Set(teamSlugs);
      enriched = enriched.filter((f) => wanted.has(f.home.slug) || wanted.has(f.away.slug));
    }
    return enriched;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFixtures, teamByName]);

  const updateFixture = useCallback(
    async (id, fields, accessToken) => {
      if (!accessToken) throw new Error('UNAUTHENTICATED');
      const current = fixtures.find((f) => f.id === id);
      if (!current) return;
      const merged = { ...current, ...fields };
      const updated = await updateFixtureRow(merged, accessToken);
      setRawFixtures((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields, updatedAt: updated.updatedAt } : r)));
    },
    [fixtures]
  );

  return { fixtures, loading, error, updateFixture };
}
