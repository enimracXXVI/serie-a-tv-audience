import CalendarView from '../components/CalendarView.jsx';
import { useFixtures } from '../lib/useFixtures.js';
import { useSession } from '../lib/useSession.js';

export default function HomePage() {
  const { fixtures, loading: fixturesLoading, error: fixturesError, updateFixture } = useFixtures([]);
  const session = useSession();

  async function handleUpdate(id, fields) {
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
          <h1 className="text-2xl font-black text-white sm:text-3xl">Serie A 26/27</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {fixturesLoading ? (
          <p className="text-white/40 text-sm">Loading fixtures…</p>
        ) : fixturesError ? (
          <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">
            {fixturesError}
          </p>
        ) : (
          <CalendarView fixtures={fixtures} onUpdate={handleUpdate} canEdit={session.signedIn} />
        )}
      </main>
    </div>
  );
}
