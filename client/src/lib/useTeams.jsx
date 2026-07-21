import { useMemo } from 'react';
import { useClubs } from './useClubs.jsx';
import { useTeamSeasons } from './useTeamSeasons.jsx';
import { useSeasons } from './useSeasons.jsx';
import { overrideTeamAttributes } from './teams.js';

// Read-only convenience filter over the unified clubs list - "the current
// Serie A roster" is just whichever clubs have scope 'current', no longer a
// separate bundled/sheet source of its own. Also merges in the current
// season's sponsored/bigClub/derbyRival/caps from teamSeasons, since those
// no longer live on the club object itself (see teams.js) - callers that
// use this roster directly rather than through an already-enriched fixture
// list (CalendarNavBar's sponsored-teams shortcut, Standings/Dashboard's
// per-club tables and charts) still need those fields set correctly.
//
// Kept as its own hook (rather than inlining this at every call site)
// purely so the many existing consumers (HomePage, DashboardPage,
// StandingsPage, CupCompetitionsPage, BrandedCalendarPage...) don't need to
// change at all - this preserves the exact `{ teams, loading, error }` shape
// they already expect. Editing a club (including changing its scope)
// happens via useClubs() directly now, from TeamsPanel - not through this
// hook.
export function useTeams() {
  const { clubs, loading, error } = useClubs();
  const { rows: teamSeasonRows } = useTeamSeasons();
  const { currentSeason } = useSeasons();

  const teams = useMemo(() => {
    const currentRoster = clubs.filter((c) => c.scope === 'current');
    const overridden = overrideTeamAttributes(currentRoster, currentSeason.label, teamSeasonRows);
    return currentRoster.map((c) => overridden.get(c.slug) ?? c);
  }, [clubs, teamSeasonRows, currentSeason.label]);

  return { teams, loading, error };
}
