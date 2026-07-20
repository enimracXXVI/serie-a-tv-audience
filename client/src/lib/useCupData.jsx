import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchCupTeams, updateCupTeam, addCupTeam } from './cupTeams.js';
import { fetchBroadcasters, updateBroadcaster, addBroadcaster } from './broadcasters.js';

const CupDataContext = createContext(null);

// Shared across the whole app (like TeamsProvider) so an edit made in
// Settings - a new cup opponent, a new broadcaster - is immediately visible
// wherever cup fixtures are shown, without a reload.
export function CupDataProvider({ children }) {
  const [cupTeams, setCupTeams] = useState([]);
  const [broadcasters, setBroadcasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCupTeams(), fetchBroadcasters()])
      .then(([teams, casters]) => {
        if (cancelled) return;
        setCupTeams(teams);
        setBroadcasters(casters);
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

  function applyMissing(fields, missingFields) {
    const missingHere = (missingFields ?? []).filter((f) => f in fields);
    const applied = { ...fields };
    for (const f of missingHere) delete applied[f];
    return { applied, missingHere };
  }

  const saveCupTeam = useCallback(async (slug, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { missingFields } = await updateCupTeam(slug, fields, accessToken);
    const { applied, missingHere } = applyMissing(fields, missingFields);
    setCupTeams((prev) => prev.map((t) => (t.slug === slug ? { ...t, ...applied } : t)));
    if (missingHere.length > 0) {
      throw new Error(`Saved, but the cupTeams sheet has no column header for: ${missingHere.join(', ')}.`);
    }
  }, []);

  const createCupTeam = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    await addCupTeam(fields, accessToken);
    setCupTeams((prev) => [...prev, fields]);
    return fields.slug;
  }, []);

  const saveBroadcaster = useCallback(async (name, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { missingFields } = await updateBroadcaster(name, fields, accessToken);
    const { applied, missingHere } = applyMissing(fields, missingFields);
    setBroadcasters((prev) => prev.map((b) => (b.name === name ? { ...b, ...applied } : b)));
    if (missingHere.length > 0) {
      throw new Error(`Saved, but the broadcasters sheet has no column header for: ${missingHere.join(', ')}.`);
    }
  }, []);

  const createBroadcaster = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    await addBroadcaster(fields, accessToken);
    setBroadcasters((prev) => [...prev, fields]);
    return fields.name;
  }, []);

  return (
    <CupDataContext.Provider
      value={{ cupTeams, broadcasters, loading, error, saveCupTeam, createCupTeam, saveBroadcaster, createBroadcaster }}
    >
      {children}
    </CupDataContext.Provider>
  );
}

export function useCupData() {
  const ctx = useContext(CupDataContext);
  if (!ctx) throw new Error('useCupData must be used within a CupDataProvider');
  return ctx;
}
