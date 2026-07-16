import { useMemo, useState } from 'react';
import { useTeams } from '../lib/useTeams.jsx';
import { useFixtures } from '../lib/useFixtures.js';
import {
  computeAllTeamMetrics,
  computeSimulcastInfo,
  computeAudienceByDay,
  computeAudienceByKickoff,
  computeAudienceByDayAndTime,
  computeTagPremium,
  computeActivationAudience,
} from '../lib/dashboardMetrics.js';
import { isPlayed } from '../lib/standings.js';
import AudienceBarChart from '../components/AudienceBarChart.jsx';
import TeamMetricsTable from '../components/TeamMetricsTable.jsx';
import TopGamesList from '../components/TopGamesList.jsx';
import AudienceByBucketChart from '../components/AudienceByBucketChart.jsx';
import DayTimeBreakdownTable from '../components/DayTimeBreakdownTable.jsx';

function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">{label}</p>
      <p className="text-xl font-black text-white">{value}</p>
      {sub && <p className="text-[10px] text-white/40">{sub}</p>}
    </div>
  );
}

function formatM(value) {
  return `${(Math.round(value * 100) / 100).toString()}M`;
}

function TagPremiumCard({ premium }) {
  const rows = [
    { key: 'regular', label: 'Regular games', ...premium.regular },
    { key: 'bigMatch', label: 'Big matches', ...premium.bigMatch },
    { key: 'derby', label: 'Derbies', ...premium.derby },
  ];
  const max = Math.max(...rows.map((r) => r.avg), 1);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <h3 className="mb-3 text-sm font-bold text-[#0f1e54]">Big match / derby audience premium</h3>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs font-semibold text-gray-600">{r.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(r.avg / max) * 100}%`,
                  background: r.key === 'regular' ? '#94a3b8' : r.key === 'bigMatch' ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-bold text-[#0f1e54]">{formatM(r.avg)}</span>
            <span className="w-12 shrink-0 text-right text-[10px] text-gray-400">{r.count}g</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivationAudienceCard({ team, activations }) {
  if (!team) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
        <h3 className="mb-2 text-sm font-bold text-[#0f1e54]">Sponsor activation audience</h3>
        <p className="text-xs text-gray-400">Click a sponsored club above to see the audience its activations reached.</p>
      </div>
    );
  }
  if (!team.sponsored) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
        <h3 className="mb-2 text-sm font-bold text-[#0f1e54]">Sponsor activation audience</h3>
        <p className="text-xs text-gray-400">{team.name} isn&apos;t marked as sponsored in Settings.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <h3 className="mb-3 text-sm font-bold text-[#0f1e54]">{team.name} - sponsor activation audience</h3>
      <div className="flex flex-col gap-2">
        {activations.map((a) => (
          <div key={a.key} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-xs font-semibold text-gray-600">{a.label}</span>
            <div className="flex items-center gap-3 text-right">
              <span className="text-[10px] text-gray-400">{a.count} activations</span>
              <span className="text-xs font-bold text-[#0f1e54]">{formatM(a.total)} total</span>
              <span className="text-xs text-gray-500">{formatM(a.avg)} avg</span>
            </div>
          </div>
        ))}
      </div>
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

  const focusedTeam = focusedSlug ? teams.find((t) => t.slug === focusedSlug) : null;

  const audienceByDay = useMemo(
    () => computeAudienceByDay(fixtures, simulcastInfo, includeSimulcast, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, focusedSlug]
  );
  const audienceByKickoff = useMemo(
    () => computeAudienceByKickoff(fixtures, simulcastInfo, includeSimulcast, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, focusedSlug]
  );
  const audienceByDayAndTime = useMemo(
    () => computeAudienceByDayAndTime(fixtures, simulcastInfo, includeSimulcast, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, focusedSlug]
  );
  const tagPremium = useMemo(
    () => computeTagPremium(fixtures, simulcastInfo, includeSimulcast, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, focusedSlug]
  );
  const activationAudience = useMemo(
    () => (focusedTeam ? computeActivationAudience(focusedTeam, fixtures, simulcastInfo, includeSimulcast) : []),
    [focusedTeam, fixtures, simulcastInfo, includeSimulcast]
  );

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

            <div>
              <p className="mb-2 text-xs font-semibold text-white/40">
                {focusedTeam
                  ? `Scheduling patterns - ${focusedTeam.name}'s games only (click their row above to clear)`
                  : 'Scheduling patterns - all clubs (click a club above to narrow to just their games)'}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AudienceByBucketChart title="Average audience by day of week" buckets={audienceByDay} />
                <AudienceByBucketChart title="Average audience by kickoff time" buckets={audienceByKickoff} />
              </div>
            </div>

            <DayTimeBreakdownTable rows={audienceByDayAndTime} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TagPremiumCard premium={tagPremium} />
              <ActivationAudienceCard team={focusedTeam} activations={activationAudience} />
            </div>

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
