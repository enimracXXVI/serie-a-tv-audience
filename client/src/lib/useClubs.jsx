import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchClubs, updateClub, addClub, deleteClub } from './clubs.js';

const ClubsContext = createContext(null);

// The single shared fetch of the unified "teams" tab for the whole app - see
// clubs.js for why every club (current roster or not) lives in one place
// now. An edit here is immediately visible wherever a fixture is already
// rendered underneath, same as every other Settings-backed provider.
export function ClubsProvider({ children }) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchClubs()
      .then((rows) => {
        if (!cancelled) setClubs(rows);
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

  const bySlug = useMemo(() => new Map(clubs.map((c) => [c.slug, c])), [clubs]);
  const byName = useMemo(() => new Map(clubs.map((c) => [c.name, c])), [clubs]);

  const saveClub = useCallback(async (slug, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { missingFields } = await updateClub(slug, fields, accessToken);
    const missingHere = (missingFields ?? []).filter((f) => f in fields);
    const applied = { ...fields };
    for (const f of missingHere) delete applied[f];
    setClubs((prev) => prev.map((c) => (c.slug === slug ? { ...c, ...applied } : c)));
    if (missingHere.length > 0) {
      throw new Error(`Saved, but the teams sheet has no column header for: ${missingHere.join(', ')}.`);
    }
  }, []);

  const createClub = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    // Uses the server's returned item (not the caller's `fields`) so an
    // auto-filled bookkeeping `id` (see sheetTab.js's bookkeepingIdField)
    // shows up immediately instead of only after the next reload.
    const { item } = await addClub(fields, accessToken);
    setClubs((prev) => [...prev, item]);
    return fields.slug;
  }, []);

  const removeClub = useCallback(async (slug, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    // Deleting actually shifts every row below it up by one - the response
    // is the freshly refetched, post-delete list, not just this row removed
    // from what was already loaded.
    const rows = await deleteClub(slug, accessToken);
    setClubs(rows);
  }, []);

  return (
    <ClubsContext.Provider value={{ clubs, bySlug, byName, loading, error, saveClub, createClub, removeClub }}>
      {children}
    </ClubsContext.Provider>
  );
}

export function useClubs() {
  const ctx = useContext(ClubsContext);
  if (!ctx) throw new Error('useClubs must be used within a ClubsProvider');
  return ctx;
}
