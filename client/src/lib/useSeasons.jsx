import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchSeasons, updateSeason, addSeason, deleteSeason } from './seasonsData.js';

const SeasonsContext = createContext(null);

// Used only if the "seasons" tab hasn't been set up yet (or is temporarily
// empty), so the rest of the app - fixtures, standings, dashboard, cups -
// still has a live season to fall back to rather than hard-breaking. Same
// graceful-degradation convention competitions.js's DEFAULT_COMPETITIONS
// already uses for a not-yet-created tab. `tab` matches the live fixtures
// tab's actual current name - every season (including the live one) points
// at a real tab now, there's no more "blank tab means live" convention.
const FALLBACK_SEASONS = [{ label: '26/27', tab: 'fixtures_26_27', current: true, slug: '26-27' }];

export function SeasonsProvider({ children }) {
  const [seasons, setSeasons] = useState(FALLBACK_SEASONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSeasons()
      .then((rows) => {
        if (!cancelled && rows.length > 0) setSeasons(rows);
      })
      .catch(() => {
        // tab doesn't exist yet - keep the built-in fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The current season always leads the list (a dropdown reading top to
  // bottom naturally shows "now" first, then history) regardless of
  // whatever order the rows happen to be typed into the sheet in.
  const orderedSeasons = useMemo(() => {
    const current = seasons.filter((s) => s.current);
    const rest = seasons.filter((s) => !s.current);
    return [...current, ...rest];
  }, [seasons]);

  const currentSeason = orderedSeasons[0];

  // Editing/adding a season is rare (once a year, at most) - Settings'
  // SeasonsPanel is the only consumer of these, same shape as every other
  // Settings-backed provider (saveClub/createClub etc. in useClubs.jsx).
  const saveSeason = useCallback(async (label, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { missingFields } = await updateSeason(label, fields, accessToken);
    const missingHere = (missingFields ?? []).filter((f) => f in fields);
    const applied = { ...fields };
    for (const f of missingHere) delete applied[f];
    setSeasons((prev) => prev.map((s) => (s.label === label ? { ...s, ...applied } : s)));
    if (missingHere.length > 0) {
      throw new Error(`Saved, but the seasons sheet has no column header for: ${missingHere.join(', ')}.`);
    }
  }, []);

  const createSeason = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    // Uses the server's returned item (not `fields`) so an auto-filled
    // bookkeeping `id` (see sheetTab.js's bookkeepingIdField) shows up
    // immediately instead of only after the next reload.
    const { item } = await addSeason(fields, accessToken);
    setSeasons((prev) => [...prev, item]);
    return fields.label;
  }, []);

  const removeSeason = useCallback(async (label, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const rows = await deleteSeason(label, accessToken);
    setSeasons(rows);
  }, []);

  return (
    <SeasonsContext.Provider
      value={{ seasons: orderedSeasons, currentSeason, loading, saveSeason, createSeason, removeSeason }}
    >
      {children}
    </SeasonsContext.Provider>
  );
}

export function useSeasons() {
  const ctx = useContext(SeasonsContext);
  if (!ctx) throw new Error('useSeasons must be used within a SeasonsProvider');
  return ctx;
}
