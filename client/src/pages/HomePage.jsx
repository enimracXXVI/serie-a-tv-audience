import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamPicker from '../components/TeamPicker.jsx';
import CalendarView from '../components/CalendarView.jsx';
import SignInBar from '../components/SignInBar.jsx';
import { useTeams } from '../lib/useTeams.js';
import { useFixtures } from '../lib/useFixtures.js';
import { useSession } from '../lib/useSession.js';
import { getSavedTeams } from '../lib/savedTeams.js';

export default function HomePage() {
  const { teams, loading: teamsLoading } = useTeams();
  const { fixtures, loading: fixturesLoading, error: fixturesError, updateFixture } = useFixtures([]);
  const session = useSession();
  const [selected, setSelected] = useState(() => getSavedTeams());
  const navigate = useNavigate();

  function toggle(slug) {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function viewCalendar() {
    if (selected.length === 0) return;
    navigate(`/calendar/${selected.join(',')}`);
  }

  async function handleUpdate(id, fields) {
    if (!session.signedIn) {
      session.signIn();
      return;
    }
    try {
      await updateFixture(id, fields, session.accessToken);
    } catch (err) {
      if (err.message === 'UNAUTHENTICATED') session.signIn();
      else console.error(err);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-black text-white sm:text-3xl">Serie A 26/27</h1>
            <SignInBar session={session} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">Build a team calendar</h2>
            {selected.length > 0 && (
              <button
                onClick={viewCalendar}
                className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black transition-transform hover:scale-105"
              >
                View calendar ({selected.length}) →
              </button>
            )}
          </div>
          {teamsLoading ? (
            <p className="text-white/40 text-sm">Loading clubs…</p>
          ) : (
            <TeamPicker teams={teams} selected={selected} onToggle={toggle} />
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">Full season calendar</h2>
          {fixturesLoading ? (
            <p className="text-white/40 text-sm">Loading fixtures…</p>
          ) : fixturesError ? (
            <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">
              {fixturesError}
            </p>
          ) : (
            <CalendarView
              fixtures={fixtures}
              onUpdate={handleUpdate}
              canEdit={session.signedIn}
              onRequireSignIn={session.signIn}
            />
          )}
        </section>
      </main>
    </div>
  );
}
