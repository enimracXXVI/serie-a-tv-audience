import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchSeasonTeamAttributes, updateSeasonTeamAttribute, createSeasonTeamAttribute, makeId } from './seasonTeamAttributes.js';

const SeasonTeamAttributesContext = createContext(null);

// Shared across the whole app, same as PastTeamsProvider - a Settings edit
// here needs to be visible immediately on Standings/Dashboard for whichever
// archive season it applies to. The "seasonTeamAttributes" tab is optional
// (added after this feature shipped) - falls back to an empty list rather
// than erroring the whole app if it hasn't been set up yet.
export function SeasonTeamAttributesProvider({ children }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSeasonTeamAttributes()
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch(() => {
        // Tab doesn't exist yet - not a real error, just nothing to override
        // with until it's created (same as otherClubs/competitions).
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Unlike TeamSettingsPanel's save (always updating one of 20 pre-seeded
  // rows), this tab starts empty - a club only gets a row the first time
  // it's configured for a given season, so this decides update-vs-append
  // itself rather than assuming the row already exists.
  const saveSeasonTeamAttribute = useCallback(
    async (seasonLabel, name, fields, accessToken) => {
      if (!accessToken) throw new Error('UNAUTHENTICATED');
      const id = makeId(seasonLabel, name);
      const existing = rows.find((r) => r.id === id);

      if (existing) {
        const { missingFields } = await updateSeasonTeamAttribute(id, fields, accessToken);
        const missingHere = (missingFields ?? []).filter((f) => f in fields);
        const applied = { ...fields };
        for (const f of missingHere) delete applied[f];
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...applied } : r)));
        if (missingHere.length > 0) {
          throw new Error(
            `Saved, but the seasonTeamAttributes sheet has no column header for: ${missingHere.join(', ')}.`
          );
        }
        return;
      }

      const allFields = { id, season: seasonLabel, name, sponsored: false, bigClub: false, derbyRival: '', ...fields };
      await createSeasonTeamAttribute(allFields, accessToken);
      setRows((prev) => [...prev, allFields]);
    },
    [rows]
  );

  return (
    <SeasonTeamAttributesContext.Provider value={{ rows, loading, saveSeasonTeamAttribute }}>
      {children}
    </SeasonTeamAttributesContext.Provider>
  );
}

export function useSeasonTeamAttributes() {
  const ctx = useContext(SeasonTeamAttributesContext);
  if (!ctx) throw new Error('useSeasonTeamAttributes must be used within a SeasonTeamAttributesProvider');
  return ctx;
}
