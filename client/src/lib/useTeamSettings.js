import { useCallback, useEffect, useState } from 'react';
import { teams as staticTeams } from './teams.js';
import { fetchTeamSettings, updateTeamSettings } from './teamSettings.js';

// Merges the bundled team list (slugs, crests) with live overrides from the
// "teams" sheet tab (name, short, colour, sponsorship counts), so Settings
// always has a full 20-team list even before every override is filled in.
export function useTeamSettings() {
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

  const teams = staticTeams.map((t) => ({ ...t, ...overrides[t.slug] }));

  const saveTeam = useCallback(async (slug, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    await updateTeamSettings(slug, fields, accessToken);
    setOverrides((prev) => ({ ...prev, [slug]: { ...prev[slug], ...fields } }));
  }, []);

  return { teams, loading, error, saveTeam };
}
