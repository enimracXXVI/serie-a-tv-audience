import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchBroadcasters, updateBroadcaster, addBroadcaster, deleteBroadcaster } from './broadcasters.js';
import { fetchCompetitions, updateCompetition, addCompetition, deleteCompetition, DEFAULT_COMPETITIONS } from './competitions.js';

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
    // Uses the server's returned item (not the caller's `fields`) so an
    // auto-filled bookkeeping `id` (see sheetTab.js's bookkeepingIdField)
    // shows up immediately instead of only after the next reload.
    const { item } = await addBroadcaster(fields, accessToken);
    setBroadcasters((prev) => [...prev, item]);
    return fields.slug;
  }, []);

  const removeBroadcaster = useCallback(async (slug, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    // Deleting actually shifts every row below it up by one - the response
    // is the freshly refetched, post-delete list, same as removeClub.
    const rows = await deleteBroadcaster(slug, accessToken);
    setBroadcasters(rows);
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
    const { item } = await addCompetition(fields, accessToken);
    setCompetitions((prev) => [...prev, item]);
    return fields.slug;
  }, []);

  const removeCompetition = useCallback(async (slug, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const rows = await deleteCompetition(slug, accessToken);
    setCompetitions(rows);
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
        removeBroadcaster,
        saveCompetition,
        createCompetition,
        removeCompetition,
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
