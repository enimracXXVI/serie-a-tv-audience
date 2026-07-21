import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFixtures, updateFixtureRow, appendFixtureRow, deleteFixtureRow } from './sheets.js';
import { enrichFixture, applySeasonTeamAttributes } from './teams.js';
import { isSerieARow } from './competitions.js';
import { useClubs } from './useClubs.jsx';
import { useTeamSeasons } from './useTeamSeasons.jsx';
import { useSeasons } from './useSeasons.jsx';
import { computeDayOfWeek } from './matchdays.js';

export function useFixtures(teamSlugs, teams) {
  const [rawFixtures, setRawFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const key = teamSlugs.slice().sort().join(',');
  const { currentSeason } = useSeasons();
  const liveTab = currentSeason.tab;

  useEffect(() => {
    if (!liveTab) return undefined;
    let cancelled = false;
    setLoading(true);
    fetchFixtures(liveTab)
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
  }, [key, liveTab]);

  const { bySlug: clubsBySlug, byName: clubsByName } = useClubs();
  const { rows: teamSeasonRows } = useTeamSeasons();

  const fixtures = useMemo(() => {
    // The live tab now also holds this season's cup fixtures (see
    // cupFixtures.js/useCupFixtures.js) - filter to Serie A rows only before
    // this hook's own consumers ever see them.
    let enriched = rawFixtures.filter(isSerieARow).map((r) => enrichFixture(r, clubsBySlug, clubsByName));
    // sponsored/bigClub/derbyRival/caps are season-scoped now, not part of
    // the club object itself - the live season gets its own row(s) in
    // teamSeasons exactly like every archive season does (see teams.js).
    enriched = applySeasonTeamAttributes(enriched, currentSeason.label, teamSeasonRows);
    if (teamSlugs.length > 0) {
      const wanted = new Set(teamSlugs);
      enriched = enriched.filter((f) => wanted.has(f.home.slug) || wanted.has(f.away.slug));
    }
    return enriched;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFixtures, clubsBySlug, clubsByName, currentSeason.label, teamSeasonRows]);

  const updateFixture = useCallback(
    async (id, fields, accessToken) => {
      if (!accessToken) throw new Error('UNAUTHENTICATED');
      const current = fixtures.find((f) => f.id === id);
      if (!current) return;
      const merged = { ...current, ...fields };
      // Recomputed on every save (not just when `date` is the field being
      // touched) so `day` can never drift out of sync with `date`.
      merged.day = computeDayOfWeek(merged.date);
      const updated = await updateFixtureRow(merged, accessToken, liveTab);

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
    [fixtures, liveTab]
  );

  // home/away are stored as the picked club's slug (see clubs.js/teams.js
  // for why slug, not name text, is the durable identity now).
  const createFixture = useCallback(
    async ({ matchday, homeSlug, awaySlug, date, kickoffTime }, accessToken) => {
      if (!accessToken) throw new Error('UNAUTHENTICATED');
      if (!teams.some((t) => t.slug === homeSlug) || !teams.some((t) => t.slug === awaySlug)) {
        throw new Error('Pick both a home and an away club.');
      }
      // day and updatedAt are stamped by appendFixtureRow itself now.
      const fields = {
        matchday,
        home: homeSlug,
        away: awaySlug,
        date: date || '',
        kickoffTime: kickoffTime || '',
      };
      const created = await appendFixtureRow(fields, accessToken, liveTab);
      setRawFixtures((prev) => [...prev, created]);
      return created.id;
    },
    [teams, liveTab]
  );

  const deleteFixture = useCallback(
    async (id, accessToken) => {
      if (!accessToken) throw new Error('UNAUTHENTICATED');
      // Deleting actually shifts every row below it up by one - the response
      // is the freshly refetched, post-delete list, not just this row removed
      // from what was already loaded.
      const rows = await deleteFixtureRow(id, accessToken, liveTab);
      setRawFixtures(rows);
    },
    [liveTab]
  );

  return { fixtures, loading, error, updateFixture, createFixture, deleteFixture };
}
