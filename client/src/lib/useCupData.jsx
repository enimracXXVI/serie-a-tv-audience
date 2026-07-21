import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchBroadcasters, updateBroadcaster, addBroadcaster } from './broadcasters.js';
import { fetchCompetitions, updateCompetition, addCompetition, DEFAULT_COMPETITIONS } from './competitions.js';

const CupDataContext = createContext(null);

// Shared across the whole app (like ClubsProvider) so an edit made in
// Settings - a new broadcaster, a competition logo - is immediately visible
// wherever cup fixtures are shown, without a reload. Club data (branding,
// scope) lives in its own ClubsProvider (useClubs.jsx), not here - this
// provider only covers broadcasters and competitions.
export function CupDataProvider({ children }) {
  const [broadcasters, setBroadcasters] = useState([]);
  const [competitions, setCompetitions] = useState(DEFAULT_COMPETITIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchBroadcasters()
      .then((casters) => {
        if (!cancelled) setBroadcasters(casters);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // A "competitions" tab is optional (added after cup competitions
    // shipped) - falls back to sensible defaults rather than erroring the
    // whole provider if it hasn't been set up yet.
    fetchCompetitions()
      .then((rows) => {
        if (!cancelled && rows.length > 0) setCompetitions(rows);
      })
      .catch(() => {
        // tab doesn't exist yet - keep the defaults already in state
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

  const saveBroadcaster = useCallback(async (slug, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { missingFields } = await updateBroadcaster(slug, fields, accessToken);
    const { applied, missingHere } = applyMissing(fields, missingFields);
    setBroadcasters((prev) => prev.map((b) => (b.slug === slug ? { ...b, ...applied } : b)));
    if (missingHere.length > 0) {
      throw new Error(`Saved, but the broadcasters sheet has no column header for: ${missingHere.join(', ')}.`);
    }
  }, []);

  const createBroadcaster = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    await addBroadcaster(fields, accessToken);
    setBroadcasters((prev) => [...prev, fields]);
    return fields.slug;
  }, []);

  const saveCompetition = useCallback(async (slug, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { missingFields } = await updateCompetition(slug, fields, accessToken);
    const { applied, missingHere } = applyMissing(fields, missingFields);
    setCompetitions((prev) => prev.map((c) => (c.slug === slug ? { ...c, ...applied } : c)));
    if (missingHere.length > 0) {
      throw new Error(`Saved, but the competitions sheet has no column header for: ${missingHere.join(', ')}.`);
    }
  }, []);

  const createCompetition = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    await addCompetition(fields, accessToken);
    setCompetitions((prev) => [...prev, fields]);
    return fields.slug;
  }, []);

  return (
    <CupDataContext.Provider
      value={{
        broadcasters,
        competitions,
        loading,
        error,
        saveBroadcaster,
        createBroadcaster,
        saveCompetition,
        createCompetition,
      }}
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
