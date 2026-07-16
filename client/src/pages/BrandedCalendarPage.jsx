import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Crest from '../components/Crest.jsx';
import CalendarView from '../components/CalendarView.jsx';
import TeamCalendarView from '../components/TeamCalendarView.jsx';
import { useTeams } from '../lib/useTeams.jsx';
import { useFixtures } from '../lib/useFixtures.js';
import { themeGradient, contrastText } from '../lib/color.js';
import { saveTeams } from '../lib/savedTeams.js';

// Team calendars are view-only - editing (scores, audience, sponsorship
// activity) only happens from the home page's full calendar.
export default function BrandedCalendarPage() {
  const { teams: slugsParam } = useParams();
  const slugs = useMemo(
    () => (slugsParam ?? '').split(',').filter(Boolean),
    [slugsParam]
  );
  const { teams, loading: teamsLoading } = useTeams();
  const { fixtures, loading: fixturesLoading, error: fixturesError } = useFixtures(slugs, teams);

  const selectedTeams = useMemo(
    () => slugs.map((s) => teams.find((t) => t.slug === s)).filter(Boolean),
    [slugs, teams]
  );

  const gradient = themeGradient(selectedTeams.map((t) => t.primary));
  const accent = selectedTeams[0]?.primary ?? '#00a651';
  const headerText = contrastText(selectedTeams[0]?.primary ?? '#1a1030');

  useEffect(() => {
    document.title = selectedTeams.length
      ? `${selectedTeams.map((t) => t.name).join(' & ')} · Serie A Calendar`
      : 'Serie A Calendar';
  }, [selectedTeams]);

  useEffect(() => {
    if (slugs.length > 0) saveTeams(slugs);
  }, [slugs]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 px-6 py-10" style={{ background: gradient }}>
        <div className="mx-auto max-w-6xl">
          <Link
            to="/"
            className="text-xs font-semibold uppercase tracking-wide opacity-70 hover:opacity-100"
            style={{ color: headerText }}
          >
            ← All teams
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {selectedTeams.map((t) =>
              selectedTeams.length > 1 ? (
                <Link
                  key={t.slug}
                  to={`/calendar/${t.slug}`}
                  title={`${t.name} calendar only`}
                  className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 backdrop-blur-sm transition-colors hover:bg-black/35"
                >
                  <Crest team={t} size={22} />
                  <span className="text-sm font-bold" style={{ color: headerText }}>
                    {t.name}
                  </span>
                </Link>
              ) : (
                <div
                  key={t.slug}
                  className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 backdrop-blur-sm"
                >
                  <Crest team={t} size={22} />
                  <span className="text-sm font-bold" style={{ color: headerText }}>
                    {t.name}
                  </span>
                </div>
              )
            )}
          </div>
          {selectedTeams.length > 1 && (
            <p className="mt-2 text-xs opacity-70" style={{ color: headerText }}>
              Tap a club above to see only their calendar.
            </p>
          )}

          <h1 className="mt-4 text-2xl font-black sm:text-3xl" style={{ color: headerText }}>
            {selectedTeams.length > 1 ? 'Combined' : selectedTeams[0]?.name ?? ''} Calendar · 26/27
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {teamsLoading || fixturesLoading ? (
          <p className="text-white/40 text-sm">Loading calendar…</p>
        ) : fixturesError ? (
          <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">
            {fixturesError}
          </p>
        ) : selectedTeams.length === 1 ? (
          <TeamCalendarView fixtures={fixtures} team={selectedTeams[0]} accent={accent} />
        ) : (
          <CalendarView fixtures={fixtures} highlightSlugs={slugs} accent={accent} canEdit={false} />
        )}
      </main>
    </div>
  );
}
