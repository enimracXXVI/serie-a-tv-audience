import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchSeasons } from './seasonsData.js';

const SeasonsContext = createContext(null);

// Used only if the "seasons" tab hasn't been set up yet (or is temporarily
// empty), so the rest of the app - fixtures, standings, dashboard, cups -
// still has a live season to fall back to rather than hard-breaking. Same
// graceful-degradation convention competitions.js's DEFAULT_COMPETITIONS
// already uses for a not-yet-created tab.
const FALLBACK_SEASONS = [{ label: '26/27', tab: null, current: true }];

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

  return (
    <SeasonsContext.Provider value={{ seasons: orderedSeasons, currentSeason, loading }}>
      {children}
    </SeasonsContext.Provider>
  );
}

export function useSeasons() {
  const ctx = useContext(SeasonsContext);
  if (!ctx) throw new Error('useSeasons must be used within a SeasonsProvider');
  return ctx;
}
