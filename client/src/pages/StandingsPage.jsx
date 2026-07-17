import { useMemo, useState } from 'react';
import { useTeams } from '../lib/useTeams.jsx';
import { useFixtures } from '../lib/useFixtures.js';
import { computeStandings, maxPlayedMatchday } from '../lib/standings.js';
import StandingsTable from '../components/StandingsTable.jsx';
import StandingsChart from '../components/StandingsChart.jsx';

export default function StandingsPage() {
  const { teams, loading: teamsLoading } = useTeams();
  const { fixtures, loading: fixturesLoading, error: fixturesError } = useFixtures([], teams);

  const loading = teamsLoading || fixturesLoading;
  const maxMatchday = useMemo(() => maxPlayedMatchday(fixtures) || 1, [fixtures]);
  // null tracks "latest matchday" live as data loads; a number means the
  // user has dragged the slider to a specific point in the season.
  const [tableMatchday, setTableMatchday] = useState(null);
  const effectiveTableMatchday = Math.min(tableMatchday ?? maxMatchday, maxMatchday);
  const standings = loading || fixturesError ? [] : computeStandings(fixtures, teams, effectiveTableMatchday);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <h1 className="text-lg font-black text-white sm:text-xl">
            Standings <span className="ml-1.5 text-xs font-semibold opacity-60">26/27</span>
          </h1>
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
            <StandingsChart fixtures={fixtures} teams={teams} />
          </>
        )}
      </main>
    </div>
  );
}
