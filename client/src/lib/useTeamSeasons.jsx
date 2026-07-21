import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchTeamSeasons, updateTeamSeason, createTeamSeason, makeId } from './teamSeasons.js';

const TeamSeasonsContext = createContext(null);

// Shared across the whole app, same as every other Settings-backed
// provider - an edit here needs to be visible immediately on
// Fixtures/Standings/Dashboard for whichever season it applies to,
// including the live one now. The "teamSeasons" tab is optional (added
// after this feature shipped) - falls back to an empty list rather than
// erroring the whole app if it hasn't been set up yet.
export function TeamSeasonsProvider({ children }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchTeamSeasons()
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch(() => {
        // Tab doesn't exist yet - not a real error, just nothing to override
        // with until it's created (same as clubs/competitions).
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Unlike a tab pre-seeded with one row per club, this tab starts empty -
  // a club only gets a row the first time it's configured for a given
  // season, so this decides update-vs-append itself rather than assuming
  // the row already exists.
  const saveTeamSeason = useCallback(
    async (seasonLabel, slug, fields, accessToken) => {
      if (!accessToken) throw new Error('UNAUTHENTICATED');
      const id = makeId(seasonLabel, slug);
      const existing = rows.find((r) => r.id === id);

      if (existing) {
        const { missingFields } = await updateTeamSeason(id, fields, accessToken);
        const missingHere = (missingFields ?? []).filter((f) => f in fields);
        const applied = { ...fields };
        for (const f of missingHere) delete applied[f];
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...applied } : r)));
        if (missingHere.length > 0) {
          throw new Error(`Saved, but the teamSeasons sheet has no column header for: ${missingHere.join(', ')}.`);
        }
        return;
      }

      const allFields = {
        id,
        season: seasonLabel,
        slug,
        sponsored: false,
        bigClub: false,
        derbyRival: '',
        matchdaySponsors: '',
        playerMascots: '',
        walkabouts: '',
        ...fields,
      };
      await createTeamSeason(allFields, accessToken);
      setRows((prev) => [...prev, allFields]);
    },
    [rows]
  );

  return (
    <TeamSeasonsContext.Provider value={{ rows, loading, saveTeamSeason }}>{children}</TeamSeasonsContext.Provider>
  );
}

export function useTeamSeasons() {
  const ctx = useContext(TeamSeasonsContext);
  if (!ctx) throw new Error('useTeamSeasons must be used within a TeamSeasonsProvider');
  return ctx;
}
