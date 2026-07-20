import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFixtures, updateFixtureRow, appendFixtureRow } from './sheets.js';
import { enrichFixture } from './teams.js';
import { computeDayOfWeek } from './matchdays.js';

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
      // Recomputed on every save (not just when `date` is the field being
      // touched) so `day` can never drift out of sync with `date`.
      merged.day = computeDayOfWeek(merged.date);
      const updated = await updateFixtureRow(merged, accessToken);

      // Only reflect locally what actually reached the sheet - a field
      // whose column header is missing didn't save, so pretending it did
      // (even just in this tab, until the next reload) would hide exactly
      // the silent failure this is meant to surface.
      const missingHere = (updated.missingFields ?? []).filter((f) => f in fields);
      const appliedFields = { ...fields };
      for (const f of missingHere) delete appliedFields[f];

      setRawFixtures((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...appliedFields, day: merged.day, updatedAt: updated.updatedAt } : r))
      );

      if (missingHere.length > 0) {
        throw new Error(
          `Saved, but the fixtures sheet has no column header for: ${missingHere.join(', ')} - that value was not saved. Check row 1 of the fixtures tab for a typo.`
        );
      }
    },
    [fixtures]
  );

  // home/away are stored (and matched) as each club's immutable staticName,
  // not its current display name - see teams.js's enrichFixture.
  const createFixture = useCallback(async ({ matchday, homeSlug, awaySlug, date, kickoffTime }, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const home = teams.find((t) => t.slug === homeSlug);
    const away = teams.find((t) => t.slug === awaySlug);
    if (!home || !away) throw new Error('Pick both a home and an away club.');
    const created = await appendFixtureRow(
      { matchday, home: home.staticName, away: away.staticName, date, kickoffTime },
      accessToken
    );
    setRawFixtures((prev) => [...prev, created]);
    return created.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  return { fixtures, loading, error, updateFixture, createFixture };
}
