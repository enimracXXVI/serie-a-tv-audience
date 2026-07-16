import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { teams as staticTeams } from './teams.js';
import { fetchTeamSettings, updateTeamSettings } from './teamSettings.js';

const TeamsContext = createContext(null);

// One shared fetch of the "teams" sheet tab for the whole app, so an edit
// made in the Settings panel is immediately visible in the calendar
// underneath (it's still mounted behind the menu overlay) without a reload.
export function TeamsProvider({ children }) {
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchTeamSettings()
      .then((bySlug) => {
        if (!cancelled) setOverrides(bySlug);
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

  // `staticName` is carried through unmodified so fixtures (which store
  // home/away as that original name text) keep matching correctly even
  // after a club is renamed here - see teams.js's enrichFixture.
  const teams = staticTeams.map((t) => ({ ...t, ...overrides[t.slug], staticName: t.name }));

  const saveTeam = useCallback(async (slug, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    await updateTeamSettings(slug, fields, accessToken);
    setOverrides((prev) => ({ ...prev, [slug]: { ...prev[slug], ...fields } }));
  }, []);

  return <TeamsContext.Provider value={{ teams, loading, error, saveTeam }}>{children}</TeamsContext.Provider>;
}

export function useTeams() {
  const ctx = useContext(TeamsContext);
  if (!ctx) throw new Error('useTeams must be used within a TeamsProvider');
  return ctx;
}
