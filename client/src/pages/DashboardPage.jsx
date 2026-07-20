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
  computeSeasonTrend,
  computeRemainingSchedule,
  computeOpponentAudience,
} from '../lib/dashboardMetrics.js';
import { isPlayed } from '../lib/standings.js';
import { useSeasonComparison } from '../lib/useSeasonComparison.js';
import AudienceBarChart from '../components/AudienceBarChart.jsx';
import TeamMetricsTable from '../components/TeamMetricsTable.jsx';
import TopGamesList from '../components/TopGamesList.jsx';
import AudienceByBucketChart from '../components/AudienceByBucketChart.jsx';
import DayTimeBreakdownTable from '../components/DayTimeBreakdownTable.jsx';
import SeasonTrendChart from '../components/SeasonTrendChart.jsx';
import DayTimeHeatmap from '../components/DayTimeHeatmap.jsx';
import ActivationDonut from '../components/ActivationDonut.jsx';
import OpponentAudienceChart from '../components/OpponentAudienceChart.jsx';
import SeasonComparisonCard from '../components/SeasonComparisonCard.jsx';
import { formatNumber } from '../lib/formatNumber.js';

function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">{label}</p>
      <p className="text-xl font-black text-white">{value}</p>
      {sub && <p className="text-[10px] text-white/40">{sub}</p>}
    </div>
  );
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
            <span className="w-16 shrink-0 text-right text-xs font-bold text-[#0f1e54]">{formatNumber(r.avg)}</span>
            <span className="w-12 shrink-0 text-right text-[10px] text-gray-400">{r.count}g</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RemainingScheduleCard({ remaining, team }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <h3 className="mb-3 text-sm font-bold text-[#0f1e54]">
        {team ? `${team.name} - remaining home fixtures` : 'Remaining fixtures - league-wide'}
      </h3>
      {remaining.total === 0 ? (
        <p className="text-xs text-gray-400">Nothing left to schedule.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-[#0f1e54]">{remaining.bigMatch}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Big matches</p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#0f1e54]">{remaining.derby}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Derbies</p>
          </div>
          <div>
            <p className="text-2xl font-black text-[#0f1e54]">{remaining.total}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Total remaining</p>
          </div>
        </div>
      )}
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
  const totalActivations = activations.reduce((a, b) => a + b.count, 0);
  if (totalActivations === 0) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
        <h3 className="mb-2 text-sm font-bold text-[#0f1e54]">{team.name} - sponsor activation audience</h3>
        <p className="text-xs text-gray-400">No activations checked yet on the home page's Sponsors tab.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <h3 className="mb-3 text-sm font-bold text-[#0f1e54]">{team.name} - sponsor activation audience</h3>
      <ActivationDonut activations={activations} />
    </div>
  );
}

export default function DashboardPage() {
  const { teams, loading: teamsLoading } = useTeams();
  const { fixtures, loading: fixturesLoading, error: fixturesError } = useFixtures([], teams);
  const [includeSimulcast, setIncludeSimulcast] = useState(false);
  const [includeSky, setIncludeSky] = useState(true);
  const [focusedSlug, setFocusedSlug] = useState(null);

  const loading = teamsLoading || fixturesLoading;

  const simulcastInfo = useMemo(() => computeSimulcastInfo(fixtures), [fixtures]);
  const metrics = useMemo(
    () => (loading ? [] : computeAllTeamMetrics(teams, fixtures, includeSimulcast, includeSky)),
    [teams, fixtures, includeSimulcast, includeSky, loading]
  );

  const playedGames = useMemo(() => fixtures.filter(isPlayed), [fixtures]);
  const teamsWithHomeGames = metrics.filter((m) => m.homeGamesPlayed > 0);
  const leagueAvgHome = teamsWithHomeGames.length
    ? teamsWithHomeGames.reduce((a, m) => a + m.homeAudienceAvg, 0) / teamsWithHomeGames.length
    : 0;
  // Every played game's audience is counted once (via the home broadcast
  // figure), so summing each club's home total across the league gives the
  // season total without double-counting a match from both sides.
  const totalAudience = metrics.reduce((a, m) => a + m.homeAudienceTotal, 0);
  const sponsoredAudience = metrics.filter((m) => m.team.sponsored).reduce((a, m) => a + m.homeAudienceTotal, 0);

  const focusedTeam = focusedSlug ? teams.find((t) => t.slug === focusedSlug) : null;

  const audienceByDay = useMemo(
    () => computeAudienceByDay(fixtures, simulcastInfo, includeSimulcast, includeSky, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, includeSky, focusedSlug]
  );
  const audienceByKickoff = useMemo(
    () => computeAudienceByKickoff(fixtures, simulcastInfo, includeSimulcast, includeSky, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, includeSky, focusedSlug]
  );
  const audienceByDayAndTime = useMemo(
    () => computeAudienceByDayAndTime(fixtures, simulcastInfo, includeSimulcast, includeSky, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, includeSky, focusedSlug]
  );
  const tagPremium = useMemo(
    () => computeTagPremium(fixtures, simulcastInfo, includeSimulcast, includeSky, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, includeSky, focusedSlug]
  );
  const activationAudience = useMemo(
    () => (focusedTeam ? computeActivationAudience(focusedTeam, fixtures, simulcastInfo, includeSimulcast, includeSky) : []),
    [focusedTeam, fixtures, simulcastInfo, includeSimulcast, includeSky]
  );
  const seasonTrend = useMemo(
    () => computeSeasonTrend(fixtures, simulcastInfo, includeSimulcast, includeSky, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, includeSky, focusedSlug]
  );
  const remainingSchedule = useMemo(() => computeRemainingSchedule(fixtures, focusedSlug), [fixtures, focusedSlug]);
  const opponentAudience = useMemo(
    () => (focusedTeam ? computeOpponentAudience(focusedTeam, fixtures, simulcastInfo, includeSimulcast, includeSky) : null),
    [focusedTeam, fixtures, simulcastInfo, includeSimulcast, includeSky]
  );

  const { seasons: comparisonSeasons } = useSeasonComparison(teams, includeSimulcast, includeSky, focusedSlug);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 pr-36">
          <h1 className="text-lg font-black text-white sm:text-xl">
            Dashboard <span className="ml-1.5 text-xs font-semibold opacity-60">26/27</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
              Focus club
              <select
                value={focusedSlug ?? ''}
                onChange={(e) => setFocusedSlug(e.target.value || null)}
                className="rounded-md border border-transparent bg-white px-2 py-1 text-xs font-semibold text-[#0f1e54] outline-none focus:border-[#1fd8c9]"
              >
                <option value="">All clubs</option>
                {teams.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <input
                type="checkbox"
                checked={includeSky}
                onChange={(e) => setIncludeSky(e.target.checked)}
                className="h-4 w-4 accent-[#1fd8c9]"
              />
              Include Sky audience (uncheck for DAZN only)
            </label>
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
              <StatTile label="League avg home audience" value={formatNumber(leagueAvgHome)} />
              <StatTile label="Total audience (season)" value={formatNumber(totalAudience)} />
              <StatTile label="Sponsored clubs' audience" value={formatNumber(sponsoredAudience)} sub="home games only" />
            </div>

            <SeasonComparisonCard seasons={comparisonSeasons} focusedTeam={focusedTeam} />

            <AudienceBarChart metrics={metrics} focusedSlug={focusedSlug} onFocus={setFocusedSlug} />

            <TeamMetricsTable metrics={metrics} focusedSlug={focusedSlug} onFocus={setFocusedSlug} />

            <SeasonTrendChart trend={seasonTrend} team={focusedTeam} />

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

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <DayTimeHeatmap rows={audienceByDayAndTime} />
              <div className="flex flex-col gap-4">
                <TagPremiumCard premium={tagPremium} />
                <RemainingScheduleCard remaining={remainingSchedule} team={focusedTeam} />
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <DayTimeBreakdownTable rows={audienceByDayAndTime} />
              <TopGamesList
                fixtures={fixtures}
                teams={teams}
                simulcastInfo={simulcastInfo}
                includeSimulcast={includeSimulcast}
                includeSky={includeSky}
                focusedSlug={focusedSlug}
              />
            </div>

            {/* These two need a focused club to show anything meaningful,
                so they sit at the bottom rather than competing for space
                with the league-wide sections above. */}
            <OpponentAudienceChart team={focusedTeam} data={opponentAudience} />

            <ActivationAudienceCard team={focusedTeam} activations={activationAudience} />
          </>
        )}
      </main>
    </div>
  );
}
