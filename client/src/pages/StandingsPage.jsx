import { useEffect, useMemo, useState } from 'react';
import { useTeams } from '../lib/useTeams.jsx';
import { useSeasonFixtures } from '../lib/useSeasonFixtures.js';
import { teamsInFixtures } from '../lib/teams.js';
import { computeStandings, maxPlayedMatchday } from '../lib/standings.js';
import { CURRENT_SEASON } from '../lib/seasons.js';
import SeasonSelector from '../components/SeasonSelector.jsx';
import StandingsTable from '../components/StandingsTable.jsx';
import StandingsChart from '../components/StandingsChart.jsx';

export default function StandingsPage() {
  const { teams, loading: teamsLoading } = useTeams();
  const [season, setSeason] = useState(CURRENT_SEASON);
  const { fixtures, loading: fixturesLoading, error: fixturesError } = useSeasonFixtures(season, teams);

  const loading = teamsLoading || fixturesLoading;

  // A past season's real 20 (or however many) clubs aren't necessarily this
  // year's roster - a promoted/relegated club since then would otherwise be
  // missing from the table entirely, and worse, every one of ITS games would
  // silently drop out of every other club's record too (computeStandings
  // skips a fixture completely if either side isn't in the team list it's
  // given). Derive the season's real roster from its own fixtures instead.
  const effectiveTeams = useMemo(() => (season.tab ? teamsInFixtures(fixtures) : teams), [season.tab, fixtures, teams]);

  const maxMatchday = useMemo(() => maxPlayedMatchday(fixtures) || 1, [fixtures]);
  // null tracks "latest matchday" live as data loads; a number means the
  // user has dragged the slider to a specific point in the season.
  const [tableMatchday, setTableMatchday] = useState(null);
  // Switching season should default back to "latest" for whichever season
  // is now shown, not stay stuck on a matchday number from the previous one.
  useEffect(() => {
    setTableMatchday(null);
  }, [season.label]);
  const effectiveTableMatchday = Math.min(tableMatchday ?? maxMatchday, maxMatchday);
  const standings = loading || fixturesError ? [] : computeStandings(fixtures, effectiveTeams, effectiveTableMatchday);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 pr-36">
          <h1 className="text-lg font-black text-white sm:text-xl">Standings</h1>
          <SeasonSelector season={season} onChange={setSeason} />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        {loading ? (
          <p className="text-sm text-white/40">Loading standings…</p>
        ) : fixturesError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {fixturesError}
          </p>
        ) : (
          <>
            <StandingsTable
              standings={standings}
              matchday={effectiveTableMatchday}
              maxMatchday={maxMatchday}
              onMatchdayChange={setTableMatchday}
            />
            <StandingsChart fixtures={fixtures} teams={effectiveTeams} />
          </>
        )}
      </main>
    </div>
  );
}
