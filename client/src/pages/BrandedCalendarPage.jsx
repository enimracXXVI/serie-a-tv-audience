import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Crest from '../components/Crest.jsx';
import CalendarView from '../components/CalendarView.jsx';
import SignInBar from '../components/SignInBar.jsx';
import { useTeams } from '../lib/useTeams.js';
import { useFixtures } from '../lib/useFixtures.js';
import { useSession } from '../lib/useSession.js';
import { themeGradient, contrastText } from '../lib/color.js';

export default function BrandedCalendarPage() {
  const { teams: slugsParam } = useParams();
  const slugs = useMemo(
    () => (slugsParam ?? '').split(',').filter(Boolean),
    [slugsParam]
  );
  const { teams, loading: teamsLoading } = useTeams();
  const { fixtures, loading: fixturesLoading, updateFixture } = useFixtures(slugs);
  const session = useSession();

  const selectedTeams = useMemo(
    () => slugs.map((s) => teams.find((t) => t.slug === s)).filter(Boolean),
    [slugs, teams]
  );

  const gradient = themeGradient(selectedTeams.map((t) => t.primary));
  const accent = selectedTeams[0]?.primary ?? '#c084fc';
  const headerText = contrastText(selectedTeams[0]?.primary ?? '#1a1030');
  const headerTone = headerText === '#0b0f16' ? 'light' : 'dark';

  useEffect(() => {
    document.title = selectedTeams.length
      ? `${selectedTeams.map((t) => t.name).join(' & ')} · Serie A Calendar`
      : 'Serie A Calendar';
  }, [selectedTeams]);

  async function handleUpdate(id, fields) {
    try {
      await updateFixture(id, fields);
    } catch (err) {
      if (err.message === 'UNAUTHENTICATED') session.signIn();
      else console.error(err);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 px-6 py-10" style={{ background: gradient }}>
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start justify-between gap-4">
            <Link
              to="/"
              className="text-xs font-semibold uppercase tracking-wide opacity-70 hover:opacity-100"
              style={{ color: headerText }}
            >
              ← All teams
            </Link>
            <SignInBar session={session} tone={headerTone} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {selectedTeams.map((t) => (
              <div key={t.slug} className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 backdrop-blur-sm">
                <Crest team={t} size={22} />
                <span className="text-sm font-bold" style={{ color: headerText }}>
                  {t.name}
                </span>
              </div>
            ))}
          </div>

          <h1 className="mt-4 text-2xl font-black sm:text-3xl" style={{ color: headerText }}>
            {selectedTeams.length > 1 ? 'Combined' : selectedTeams[0]?.name ?? ''} Calendar · 2026/27
          </h1>
          <p className="mt-1 text-sm opacity-80" style={{ color: headerText }}>
            Every fixture involving {selectedTeams.map((t) => t.name).join(', ') || 'your teams'}, with results
            and DAZN / Sky audience.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {teamsLoading || fixturesLoading ? (
          <p className="text-white/40 text-sm">Loading calendar…</p>
        ) : (
          <CalendarView
            fixtures={fixtures}
            onUpdate={handleUpdate}
            highlightSlugs={slugs}
            accent={accent}
            canEdit={session.signedIn}
            onRequireSignIn={session.signIn}
          />
        )}
      </main>
    </div>
  );
}
