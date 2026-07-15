import { useCallback, useEffect, useState } from 'react';
import { fetchFixtures, updateFixtureRow } from './sheets.js';
import { enrichFixture } from './teams.js';

export function useFixtures(teamSlugs) {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const key = teamSlugs.slice().sort().join(',');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFixtures()
      .then((rows) => {
        if (cancelled) return;
        let enriched = rows.map(enrichFixture);
        if (teamSlugs.length > 0) {
          const wanted = new Set(teamSlugs);
          enriched = enriched.filter((f) => wanted.has(f.home.slug) || wanted.has(f.away.slug));
        }
        setFixtures(enriched);
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

  const updateFixture = useCallback(
    async (id, fields, accessToken) => {
      if (!accessToken) throw new Error('UNAUTHENTICATED');
      const current = fixtures.find((f) => f.id === id);
      if (!current) return;
      const merged = { ...current, ...fields };
      const updated = await updateFixtureRow(merged, accessToken);
      setFixtures((prev) => prev.map((f) => (f.id === id ? { ...f, ...fields, updatedAt: updated.updatedAt } : f)));
    },
    [fixtures]
  );

  return { fixtures, loading, error, updateFixture };
}
