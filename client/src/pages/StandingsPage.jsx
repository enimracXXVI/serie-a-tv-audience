import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTeams } from '../lib/useTeams.jsx';
import { useSeasonFixtures } from '../lib/useSeasonFixtures.js';
import { teamsInFixtures } from '../lib/teams.js';
import { computeStandings, maxPlayedMatchday } from '../lib/standings.js';
import { useCupData } from '../lib/useCupData.jsx';
import { serieALogo } from '../lib/competitions.js';
import { useSeasonParam } from '../lib/useSeasonParam.js';
import SeasonSelector from '../components/SeasonSelector.jsx';
import StandingsTable from '../components/StandingsTable.jsx';
import StandingsChart from '../components/StandingsChart.jsx';

export default function StandingsPage() {
  const { teams, loading: teamsLoading } = useTeams();
  const { competitions } = useCupData();
  const serieALogoUrl = serieALogo(competitions);
  const [season, setSeason] = useSeasonParam();
  const { fixtures, loading: fixturesLoading, error: fixturesError } = useSeasonFixtures(season, teams);

  const loading = teamsLoading || fixturesLoading;

  // A past season's real 20 (or however many) clubs aren't necessarily this
  // year's roster - a promoted/relegated club since then would otherwise be
  // missing from the table entirely, and worse, every one of ITS games would
  // silently drop out of every other club's record too (computeStandings
  // skips a fixture completely if either side isn't in the team list it's
  // given). Derive the season's real roster from its own fixtures instead.
  const effectiveTeams = useMemo(
    () => (season.current ? teams : teamsInFixtures(fixtures)),
    [season, fixtures, teams]
  );

  const maxMatchday = useMemo(() => maxPlayedMatchday(fixtures) || 1, [fixtures]);

  // '?matchday=' persists which matchday the table is shown as-of, so a
  // bookmarked/shared link reopens on the same point in the season instead
  // of always resetting to "latest". Absent (or blank, e.g. right after
  // useSeasonParam clears it on a season change) means "latest" - only
  // written into the URL once the user actually drags the slider away from
  // that.
  const [searchParams, setSearchParams] = useSearchParams();
  const matchdayParam = searchParams.get('matchday');
  const tableMatchday = matchdayParam ? Number(matchdayParam) : null;

  function setTableMatchday(next) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === null) params.delete('matchday');
        else params.set('matchday', String(next));
        return params;
      },
      { replace: true }
    );
  }

  const effectiveTableMatchday = Math.min(Math.max(tableMatchday ?? maxMatchday, 1), maxMatchday);
  const standings = loading || fixturesError ? [] : computeStandings(fixtures, effectiveTeams, effectiveTableMatchday);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 pr-16">
          <h1 className="flex items-center gap-2 text-lg font-black text-white sm:text-xl">
            {serieALogoUrl && <img src={serieALogoUrl} alt="" className="h-6 w-auto object-contain sm:h-7" />}
            Standings
          </h1>
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
