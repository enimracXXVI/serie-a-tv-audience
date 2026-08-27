import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFixtures, updateFixtureRow, appendFixtureRow, deleteFixtureRow } from './sheets.js';
import { fetchSeasonFixtures } from './seasonFixtures.js';
import { enrichFixture, applySeasonTeamAttributes } from './teams.js';
import { isSerieARow } from './competitions.js';
import { useClubs } from './useClubs.jsx';
import { useTeamSeasons } from './useTeamSeasons.jsx';
import { useSeasons } from './useSeasons.jsx';

// Cup fixtures for a season now live in that season's own fixtures tab,
// alongside its Serie A rows (see sheets.js/competitions.js's isSerieARow) -
// this hook mirrors useSeasonFixtures.js's live-vs-archive branching exactly,
// just filtering to the OTHER half of the same tab's rows. The live season
// reads/writes through the same editable path (sheets.js) Serie A uses;
// an archive season is read-only via the same fetchSeasonFixtures used for
// archived Serie A fixtures - past cup seasons are frozen (no create/edit),
// same precedent as Serie A's own archive tabs.
export function useCupFixtures(season) {
  const isCurrent = Boolean(season.current);
  const { currentSeason } = useSeasons();
  const liveTab = currentSeason.tab;
  const tab = isCurrent ? liveTab : season.tab;

  const [rawFixtures, setRawFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tab) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const fetcher = isCurrent ? fetchFixtures(tab) : fetchSeasonFixtures(tab);
    fetcher
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
  }, [isCurrent, tab]);

  const { bySlug: clubsBySlug, byName: clubsByName } = useClubs();
  const { rows: teamSeasonRows } = useTeamSeasons();

  const fixtures = useMemo(() => {
    const cupRows = rawFixtures.filter((r) => !isSerieARow(r));
    const enriched = cupRows.map((r) => enrichFixture(r, clubsBySlug, clubsByName));
    // sponsored is season-scoped (teamSeasons); bigClub/derbyRival also flow
    // through here but are never rendered for a cup fixture (see
    // CupFixtureRow/CupRoundGroup - big-match/derby tagging stays Serie A
    // only by design).
    return applySeasonTeamAttributes(enriched, season.label, teamSeasonRows);
  }, [rawFixtures, clubsBySlug, clubsByName, season.label, teamSeasonRows]);

  // `updateFixtureRow` writes only the fields actually passed in (a true
  // partial patch - see sheets.js), so this never touches `competition`/
  // `round`/etc. it wasn't asked to change.
  const updateFixture = useCallback(
    async (id, fields, accessToken) => {
      if (!accessToken) throw new Error('UNAUTHENTICATED');
      const updated = await updateFixtureRow(id, fields, accessToken, liveTab);

      const missingHere = (updated.missingFields ?? []).filter((f) => f in fields);
      const applied = { ...fields };
      for (const f of missingHere) delete applied[f];

      setRawFixtures((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, ...applied, ...(updated.day !== undefined ? { day: updated.day } : {}), updatedAt: updated.updatedAt }
            : r
        )
      );

      if (missingHere.length > 0) {
        throw new Error(`Saved, but the fixtures sheet has no column header for: ${missingHere.join(', ')}.`);
      }
    },
    [liveTab]
  );

  // Always the live season's own tab regardless of which one is currently
  // being viewed - past cup seasons are frozen once they're no longer
  // current, same as Serie A's archive tabs.
  const createFixture = useCallback(
    async (fields, accessToken) => {
      if (!accessToken) throw new Error('UNAUTHENTICATED');
      const created = await appendFixtureRow(fields, accessToken, liveTab);
      setRawFixtures((prev) => [...prev, created]);
      return created.id;
    },
    [liveTab]
  );

  const deleteFixture = useCallback(
    async (id, accessToken) => {
      if (!accessToken) throw new Error('UNAUTHENTICATED');
      // Deleting actually shifts every row below it up by one - the response
      // is the freshly refetched, post-delete list (this season's whole
      // tab - Serie A rows included), not just this row removed from what
      // was already loaded.
      const rows = await deleteFixtureRow(id, accessToken, liveTab);
      setRawFixtures(rows);
    },
    [liveTab]
  );

  if (!isCurrent) {
    return { fixtures, loading, error, updateFixture: null, createFixture: null, deleteFixture: null };
  }
  return { fixtures, loading, error, updateFixture, createFixture, deleteFixture };
}
