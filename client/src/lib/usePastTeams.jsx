import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchPastTeams, updatePastTeam, addPastTeam } from './pastTeams.js';

const PastTeamsContext = createContext(null);

// Shared across the whole app, same as TeamsProvider/CupDataProvider, so a
// crest added in Settings shows up immediately on the Standings/Dashboard
// pages already rendered underneath. The "pastTeams" tab is optional (added
// after this feature shipped) - falls back to an empty list rather than
// erroring the whole app if it hasn't been set up yet, same as the
// "competitions" tab.
export function PastTeamsProvider({ children }) {
  const [pastTeams, setPastTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPastTeams()
      .then((rows) => {
        if (!cancelled) setPastTeams(rows);
      })
      .catch(() => {
        // Tab doesn't exist yet - not a real error, just nothing to enrich
        // fallback teams with until it's created (same as "competitions").
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byName = useMemo(() => new Map(pastTeams.map((t) => [t.name, t])), [pastTeams]);

  const savePastTeam = useCallback(async (name, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { missingFields } = await updatePastTeam(name, fields, accessToken);
    const missingHere = (missingFields ?? []).filter((f) => f in fields);
    const applied = { ...fields };
    for (const f of missingHere) delete applied[f];
    setPastTeams((prev) => prev.map((t) => (t.name === name ? { ...t, ...applied } : t)));
    if (missingHere.length > 0) {
      throw new Error(`Saved, but the pastTeams sheet has no column header for: ${missingHere.join(', ')}.`);
    }
  }, []);

  const createPastTeam = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    await addPastTeam(fields, accessToken);
    setPastTeams((prev) => [...prev, fields]);
    return fields.name;
  }, []);

  return (
    <PastTeamsContext.Provider value={{ pastTeams, byName, loading, savePastTeam, createPastTeam }}>
      {children}
    </PastTeamsContext.Provider>
  );
}

export function usePastTeams() {
  const ctx = useContext(PastTeamsContext);
  if (!ctx) throw new Error('usePastTeams must be used within a PastTeamsProvider');
  return ctx;
}
