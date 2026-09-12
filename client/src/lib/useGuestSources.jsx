import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchGuestSources, updateGuestSource, addGuestSource, deleteGuestSource } from './guestSources.js';

const GuestSourcesContext = createContext(null);

// Shared across the whole app (like CupDataProvider) - a category added or
// renamed in Settings should show up immediately in Hospitality's guest
// form without a reload, and vice versa. Kept as its own small provider
// rather than folded into CupDataProvider, which is explicitly scoped to
// cup fixtures' own broadcasters/competitions and has nothing to do with
// hospitality guests.
export function GuestSourcesProvider({ children }) {
  const [guestSources, setGuestSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // The tab is optional (added after Hospitality shipped) - an empty list
    // just means GuestForm's Source field has nothing to offer yet, not a
    // hard error for the whole app.
    fetchGuestSources()
      .then((rows) => {
        if (!cancelled) setGuestSources(rows);
      })
      .catch(() => {
        // tab doesn't exist yet - keep the empty list
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveGuestSource = useCallback(async (slug, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { missingFields } = await updateGuestSource(slug, fields, accessToken);
    const missingHere = (missingFields ?? []).filter((f) => f in fields);
    const applied = { ...fields };
    for (const f of missingHere) delete applied[f];
    setGuestSources((prev) => prev.map((s) => (s.slug === slug ? { ...s, ...applied } : s)));
    if (missingHere.length > 0) {
      throw new Error(`Saved, but the guestSources sheet has no column header for: ${missingHere.join(', ')}.`);
    }
  }, []);

  const createGuestSource = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { item } = await addGuestSource(fields, accessToken);
    setGuestSources((prev) => [...prev, item]);
    return fields.slug;
  }, []);

  const removeGuestSource = useCallback(async (slug, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const rows = await deleteGuestSource(slug, accessToken);
    setGuestSources(rows);
  }, []);

  return (
    <GuestSourcesContext.Provider
      value={{ guestSources, loading, saveGuestSource, createGuestSource, removeGuestSource }}
    >
      {children}
    </GuestSourcesContext.Provider>
  );
}

export function useGuestSources() {
  const ctx = useContext(GuestSourcesContext);
  if (!ctx) throw new Error('useGuestSources must be used within a GuestSourcesProvider');
  return ctx;
}
