import { useMemo, useState } from 'react';
import { useTeams } from '../lib/useTeams.jsx';
import { useFixtures } from '../lib/useFixtures.js';
import { computeAllTeamMetrics, computeSimulcastInfo } from '../lib/dashboardMetrics.js';
import { isPlayed } from '../lib/standings.js';
import AudienceBarChart from '../components/AudienceBarChart.jsx';
import TeamMetricsTable from '../components/TeamMetricsTable.jsx';
import TopGamesList from '../components/TopGamesList.jsx';

function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">{label}</p>
      <p className="text-xl font-black text-white">{value}</p>
      {sub && <p className="text-[10px] text-white/40">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { teams, loading: teamsLoading } = useTeams();
  const { fixtures, loading: fixturesLoading, error: fixturesError } = useFixtures([], teams);
  const [includeSimulcast, setIncludeSimulcast] = useState(false);
  const [focusedSlug, setFocusedSlug] = useState(null);

  const loading = teamsLoading || fixturesLoading;

  const simulcastInfo = useMemo(() => computeSimulcastInfo(fixtures), [fixtures]);
  const metrics = useMemo(
    () => (loading ? [] : computeAllTeamMetrics(teams, fixtures, includeSimulcast)),
    [teams, fixtures, includeSimulcast, loading]
  );

  const playedGames = useMemo(() => fixtures.filter(isPlayed), [fixtures]);
  const teamsWithHomeGames = metrics.filter((m) => m.homeGamesPlayed > 0);
  const leagueAvgHome = teamsWithHomeGames.length
    ? teamsWithHomeGames.reduce((a, m) => a + m.homeAudienceAvg, 0) / teamsWithHomeGames.length
    : 0;
  const simulcastGames = useMemo(() => new Set(fixtures.filter((f) => simulcastInfo.has(f.id)).map((f) => f.id)).size, [
    fixtures,
    simulcastInfo,
  ]);
  const skyGames = playedGames.filter((f) => f.onSky).length;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-black text-white sm:text-xl">
            Dashboard <span className="ml-1.5 text-xs font-semibold opacity-60">26/27</span>
          </h1>
          <label className="flex items-center gap-2 text-xs font-semibold text-white/70">
            <input
              type="checkbox"
              checked={includeSimulcast}
              onChange={(e) => setIncludeSimulcast(e.target.checked)}
              className="h-4 w-4 accent-[#1fd8c9]"
            />
            Include simulcast audience (split evenly across the block)
          </label>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        {loading ? (
          <p className="text-sm text-white/40">Loading dashboard…</p>
        ) : fixturesError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {fixturesError}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Games played" value={playedGames.length} sub={`of ${fixtures.length} scheduled`} />
              <StatTile label="League avg home audience" value={`${leagueAvgHome.toFixed(2)}M`} />
              <StatTile label="Simulcast games" value={simulcastGames} sub="shared DAZN slots" />
              <StatTile label="Games on Sky" value={skyGames} />
            </div>

            <AudienceBarChart metrics={metrics} focusedSlug={focusedSlug} onFocus={setFocusedSlug} />

            <TeamMetricsTable metrics={metrics} focusedSlug={focusedSlug} onFocus={setFocusedSlug} />

            <TopGamesList
              fixtures={fixtures}
              teams={teams}
              simulcastInfo={simulcastInfo}
              includeSimulcast={includeSimulcast}
              focusedSlug={focusedSlug}
            />
          </>
        )}
      </main>
    </div>
  );
}
