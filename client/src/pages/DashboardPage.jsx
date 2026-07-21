import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTeams } from '../lib/useTeams.jsx';
import { useSeasonFixtures } from '../lib/useSeasonFixtures.js';
import { teamsInFixtures } from '../lib/teams.js';
import { useSeasonParam } from '../lib/useSeasonParam.js';
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
import SeasonSelector from '../components/SeasonSelector.jsx';
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
import ToggleSwitch from '../components/ToggleSwitch.jsx';
import ScreenshotableCard from '../components/ScreenshotableCard.jsx';
import { formatNumber } from '../lib/formatNumber.js';
import { useCupData } from '../lib/useCupData.jsx';

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

// Anchors for the floating desktop quick-nav below - one per major card/
// section, in the same top-to-bottom order they appear on the page, so
// clicking down the rail matches scrolling down the page.
const NAV_SECTIONS = [
  { id: 'dash-stats', label: 'Stats' },
  { id: 'dash-comparison', label: 'Season comparison' },
  { id: 'dash-ranked', label: 'Audience by club' },
  { id: 'dash-table', label: 'Club table' },
  { id: 'dash-trend', label: 'Season trend' },
  { id: 'dash-scheduling', label: 'Scheduling patterns' },
  { id: 'dash-heatmap', label: 'Heatmap' },
  { id: 'dash-games', label: 'Top games' },
  { id: 'dash-opponent', label: 'Home audience by opponent' },
  { id: 'dash-activation', label: 'Sponsor activation' },
];

// Desktop only ("dashboard on desktop... a bit frustrating to have to
// scroll up and down") - a slim dot rail rather than a full labelled menu,
// since the page is long enough that ten full-width nav items would be
// their own scrolling problem. Each dot expands into a text pill on hover,
// matching the app's existing pill-button visual language rather than
// introducing a new nav idiom.
function QuickNav() {
  return (
    <nav aria-label="Jump to dashboard section" className="fixed left-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-1.5 lg:flex">
      {NAV_SECTIONS.map((s) => (
        <a key={s.id} href={`#${s.id}`} className="group flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-white/25 transition-colors group-hover:bg-[#1fd8c9]" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap rounded-full bg-[#0f1e54] py-1 text-[10px] font-bold text-white opacity-0 shadow-md transition-all group-hover:max-w-[220px] group-hover:px-2.5 group-hover:opacity-100">
            {s.label}
          </span>
        </a>
      ))}
    </nav>
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
  const { broadcasters } = useCupData();
  const mainBroadcasterName = broadcasters.find((b) => b.isMain)?.name || 'main broadcaster';
  const [season, setSeason] = useSeasonParam();
  const { fixtures, loading: fixturesLoading, error: fixturesError } = useSeasonFixtures(season, teams);
  const [searchParams, setSearchParams] = useSearchParams();
  // Defaults to off whenever the URL doesn't say otherwise - only written
  // into the URL when turned on, so a plain /dashboard link stays clean.
  const [includeOther, setIncludeOtherState] = useState(() => searchParams.get('other') === '1');
  const setIncludeOther = (value) => {
    setIncludeOtherState(value);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('other', '1');
        else next.delete('other');
        return next;
      },
      { replace: true }
    );
  };
  const [includeSimulcast, setIncludeSimulcastState] = useState(() => searchParams.get('simulcast') === '1');
  const setIncludeSimulcast = (value) => {
    setIncludeSimulcastState(value);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('simulcast', '1');
        else next.delete('simulcast');
        return next;
      },
      { replace: true }
    );
  };
  // Which club is focused - also shareable, same reasoning as the two
  // toggles above.
  const [focusedSlug, setFocusedSlugState] = useState(() => searchParams.get('team') || null);
  const setFocusedSlug = (slug) => {
    setFocusedSlugState(slug);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (slug) next.set('team', slug);
        else next.delete('team');
        return next;
      },
      { replace: true }
    );
  };

  const loading = teamsLoading || fixturesLoading;

  // A past season's actual clubs aren't necessarily this year's 20 - a
  // promoted/relegated club since then still needs to show up in every
  // section below (ranked bar chart, table, focus-club dropdown...), so
  // derive the season's real roster from its own fixtures rather than
  // assuming the current one played it.
  const effectiveTeams = useMemo(
    () => (season.current ? teams : teamsInFixtures(fixtures)),
    [season, fixtures, teams]
  );

  // Switching season can leave a focused club that didn't play in the new
  // one - reset back to "all clubs" rather than silently focusing a club
  // with zero games this season. Skipped on the very first render so a
  // shared/bookmarked `?team=` link isn't wiped out the instant it loads -
  // this should only fire on an actual, later season change.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setFocusedSlug(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season.label]);

  const simulcastInfo = useMemo(() => computeSimulcastInfo(fixtures), [fixtures]);
  const metrics = useMemo(
    () => (loading ? [] : computeAllTeamMetrics(effectiveTeams, fixtures, includeSimulcast, includeOther)),
    [effectiveTeams, fixtures, includeSimulcast, includeOther, loading]
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

  const focusedTeam = focusedSlug ? effectiveTeams.find((t) => t.slug === focusedSlug) : null;

  const audienceByDay = useMemo(
    () => computeAudienceByDay(fixtures, simulcastInfo, includeSimulcast, includeOther, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, includeOther, focusedSlug]
  );
  const audienceByKickoff = useMemo(
    () => computeAudienceByKickoff(fixtures, simulcastInfo, includeSimulcast, includeOther, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, includeOther, focusedSlug]
  );
  const audienceByDayAndTime = useMemo(
    () => computeAudienceByDayAndTime(fixtures, simulcastInfo, includeSimulcast, includeOther, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, includeOther, focusedSlug]
  );
  const tagPremium = useMemo(
    () => computeTagPremium(fixtures, simulcastInfo, includeSimulcast, includeOther, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, includeOther, focusedSlug]
  );
  const activationAudience = useMemo(
    () => (focusedTeam ? computeActivationAudience(focusedTeam, fixtures, simulcastInfo, includeSimulcast, includeOther) : []),
    [focusedTeam, fixtures, simulcastInfo, includeSimulcast, includeOther]
  );
  const seasonTrend = useMemo(
    () => computeSeasonTrend(fixtures, simulcastInfo, includeSimulcast, includeOther, focusedSlug),
    [fixtures, simulcastInfo, includeSimulcast, includeOther, focusedSlug]
  );
  const remainingSchedule = useMemo(() => computeRemainingSchedule(fixtures, focusedSlug), [fixtures, focusedSlug]);
  const opponentAudience = useMemo(
    () => (focusedTeam ? computeOpponentAudience(focusedTeam, fixtures, simulcastInfo, includeSimulcast, includeOther) : null),
    [focusedTeam, fixtures, simulcastInfo, includeSimulcast, includeOther]
  );

  const { seasons: comparisonSeasons } = useSeasonComparison(teams, includeSimulcast, includeOther, focusedSlug);

  return (
    <div className="min-h-screen">
      {!loading && !fixturesError && <QuickNav />}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 pr-36">
          <h1 className="text-lg font-black text-white sm:text-xl">
            Dashboard <span className="ml-1.5 text-xs font-semibold opacity-60">{season.label}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <SeasonSelector season={season} onChange={setSeason} />
            <label className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
              Focus club
              <select
                value={focusedSlug ?? ''}
                onChange={(e) => setFocusedSlug(e.target.value || null)}
                className="rounded-md border border-transparent bg-white px-2 py-1 text-xs font-semibold text-[#0f1e54] outline-none focus:border-[#1fd8c9]"
              >
                <option value="">All clubs</option>
                {effectiveTeams.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <ToggleSwitch
              checked={includeOther}
              onChange={setIncludeOther}
              label="Include other broadcaster audience"
              title={`Uncheck for ${mainBroadcasterName}-only numbers`}
            />
            <ToggleSwitch
              checked={includeSimulcast}
              onChange={setIncludeSimulcast}
              label="Include simulcast"
              title="Split each shared simulcast slot's audience evenly across its games"
            />
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
            <div id="dash-stats" className="scroll-mt-20">
              <ScreenshotableCard filename={`dashboard-stats-${season.label.replace('/', '-')}`} background="#0f1e54">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatTile label="Games played" value={playedGames.length} sub={`of ${fixtures.length} scheduled`} />
                  <StatTile label="League avg home audience" value={formatNumber(leagueAvgHome)} />
                  <StatTile label="Total audience (season)" value={formatNumber(totalAudience)} />
                  <StatTile label="Sponsored clubs' audience" value={formatNumber(sponsoredAudience)} sub="home games only" />
                </div>
              </ScreenshotableCard>
            </div>

            <div id="dash-comparison" className="scroll-mt-20">
              <ScreenshotableCard filename="dashboard-season-comparison">
                <SeasonComparisonCard seasons={comparisonSeasons} focusedTeam={focusedTeam} />
              </ScreenshotableCard>
            </div>

            <div id="dash-ranked" className="scroll-mt-20">
              <ScreenshotableCard filename={`dashboard-audience-by-club-${season.label.replace('/', '-')}`}>
                <AudienceBarChart metrics={metrics} focusedSlug={focusedSlug} onFocus={setFocusedSlug} />
              </ScreenshotableCard>
            </div>

            <div id="dash-table" className="scroll-mt-20">
              <ScreenshotableCard filename={`dashboard-club-table-${season.label.replace('/', '-')}`}>
                <TeamMetricsTable metrics={metrics} focusedSlug={focusedSlug} onFocus={setFocusedSlug} />
              </ScreenshotableCard>
            </div>

            <div id="dash-trend" className="scroll-mt-20">
              <ScreenshotableCard filename={`dashboard-season-trend-${season.label.replace('/', '-')}`}>
                <SeasonTrendChart trend={seasonTrend} team={focusedTeam} />
              </ScreenshotableCard>
            </div>

            <div id="dash-scheduling" className="scroll-mt-20">
              <p className="mb-2 text-xs font-semibold text-white/40">
                {focusedTeam
                  ? `Scheduling patterns - ${focusedTeam.name}'s games only (click their row above to clear)`
                  : 'Scheduling patterns - all clubs (click a club above to narrow to just their games)'}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ScreenshotableCard filename="dashboard-audience-by-day">
                  <AudienceByBucketChart title="Average audience by day of week" buckets={audienceByDay} />
                </ScreenshotableCard>
                <ScreenshotableCard filename="dashboard-audience-by-kickoff">
                  <AudienceByBucketChart title="Average audience by kickoff time" buckets={audienceByKickoff} />
                </ScreenshotableCard>
              </div>
            </div>

            <div id="dash-heatmap" className="scroll-mt-20 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ScreenshotableCard filename="dashboard-day-kickoff-heatmap">
                <DayTimeHeatmap rows={audienceByDayAndTime} simulcastInfo={simulcastInfo} />
              </ScreenshotableCard>
              <div className="flex h-full flex-col gap-4">
                <ScreenshotableCard filename="dashboard-tag-premium">
                  <TagPremiumCard premium={tagPremium} />
                </ScreenshotableCard>
                <ScreenshotableCard filename="dashboard-remaining-schedule">
                  <RemainingScheduleCard remaining={remainingSchedule} team={focusedTeam} />
                </ScreenshotableCard>
              </div>
            </div>

            <div id="dash-games" className="scroll-mt-20 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ScreenshotableCard filename="dashboard-day-kickoff-breakdown">
                <DayTimeBreakdownTable rows={audienceByDayAndTime} simulcastInfo={simulcastInfo} />
              </ScreenshotableCard>
              <ScreenshotableCard filename="dashboard-top-games">
                <TopGamesList
                  fixtures={fixtures}
                  teams={effectiveTeams}
                  simulcastInfo={simulcastInfo}
                  includeSimulcast={includeSimulcast}
                  includeOther={includeOther}
                  focusedSlug={focusedSlug}
                />
              </ScreenshotableCard>
            </div>

            {/* These two need a focused club to show anything meaningful,
                so they sit at the bottom rather than competing for space
                with the league-wide sections above. */}
            <div id="dash-opponent" className="scroll-mt-20">
              <ScreenshotableCard filename="dashboard-opponent-audience">
                <OpponentAudienceChart team={focusedTeam} data={opponentAudience} simulcastInfo={simulcastInfo} />
              </ScreenshotableCard>
            </div>

            <div id="dash-activation" className="scroll-mt-20">
              <ScreenshotableCard filename="dashboard-activation-audience">
                <ActivationAudienceCard team={focusedTeam} activations={activationAudience} />
              </ScreenshotableCard>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
