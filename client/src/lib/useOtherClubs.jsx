import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchOtherClubs, updateOtherClub, addOtherClub, deleteOtherClub } from './otherClubs.js';

const OtherClubsContext = createContext(null);

// Shared across the whole app, same as TeamsProvider/CupDataProvider, so an
// edit made in Settings shows up immediately wherever a fixture is already
// rendered underneath. The "otherClubs" tab is optional (added after this
// feature shipped) - falls back to an empty list rather than erroring the
// whole app if it hasn't been set up yet, same as "competitions" was.
export function OtherClubsProvider({ children }) {
  const [otherClubs, setOtherClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchOtherClubs()
      .then((rows) => {
        if (!cancelled) setOtherClubs(rows);
      })
      .catch(() => {
        // Tab doesn't exist yet - not a real error, just nothing to enrich
        // fallback clubs with until it's created.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byName = useMemo(() => new Map(otherClubs.map((t) => [t.name, t])), [otherClubs]);

  const saveOtherClub = useCallback(async (name, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { missingFields } = await updateOtherClub(name, fields, accessToken);
    const missingHere = (missingFields ?? []).filter((f) => f in fields);
    const applied = { ...fields };
    for (const f of missingHere) delete applied[f];
    setOtherClubs((prev) => prev.map((t) => (t.name === name ? { ...t, ...applied } : t)));
    if (missingHere.length > 0) {
      throw new Error(`Saved, but the otherClubs sheet has no column header for: ${missingHere.join(', ')}.`);
    }
  }, []);

  const createOtherClub = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    await addOtherClub(fields, accessToken);
    setOtherClubs((prev) => [...prev, fields]);
    return fields.name;
  }, []);

  const removeOtherClub = useCallback(async (name, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    await deleteOtherClub(name, accessToken);
    setOtherClubs((prev) => prev.filter((t) => t.name !== name));
  }, []);

  return (
    <OtherClubsContext.Provider
      value={{ otherClubs, byName, loading, saveOtherClub, createOtherClub, removeOtherClub }}
    >
      {children}
    </OtherClubsContext.Provider>
  );
}

export function useOtherClubs() {
  const ctx = useContext(OtherClubsContext);
  if (!ctx) throw new Error('useOtherClubs must be used within an OtherClubsProvider');
  return ctx;
}
