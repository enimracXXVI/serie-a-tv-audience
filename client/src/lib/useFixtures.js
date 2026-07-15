import { useCallback, useEffect, useState } from 'react';
import { getFixtures, patchFixture } from './api.js';

export function useFixtures(teamSlugs) {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const key = teamSlugs.slice().sort().join(',');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFixtures(teamSlugs)
      .then((data) => {
        if (!cancelled) setFixtures(data);
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

  const updateFixture = useCallback(async (id, fields) => {
    const updated = await patchFixture(id, fields);
    setFixtures((prev) => prev.map((f) => (f.id === id ? updated : f)));
  }, []);

  return { fixtures, loading, error, updateFixture };
}
