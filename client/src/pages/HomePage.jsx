import { useState } from 'react';
import CalendarView from '../components/CalendarView.jsx';
import CalendarNavBar from '../components/CalendarNavBar.jsx';
import { useFixtures } from '../lib/useFixtures.js';
import { useTeams } from '../lib/useTeams.jsx';
import { useSession } from '../lib/useSession.js';
import { syncMatchTags } from '../lib/sheets.js';
import { callWithReauth } from '../lib/reauth.js';

export default function HomePage() {
  const { teams } = useTeams();
  const { fixtures, loading: fixturesLoading, error: fixturesError, updateFixture } = useFixtures([], teams);
  const session = useSession();
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | 'done' | error message
  const [updateError, setUpdateError] = useState(null);

  async function handleUpdate(id, fields) {
    try {
      await callWithReauth(session, (token) => updateFixture(id, fields, token));
      setUpdateError(null);
    } catch (err) {
      setUpdateError(err.message);
    }
  }

  async function handleSyncTags() {
    setSyncStatus('syncing');
    try {
      await callWithReauth(session, (token) => syncMatchTags(fixtures, token));
      setSyncStatus('done');
    } catch (err) {
      setSyncStatus(err.message);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-3">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-lg font-black text-white sm:text-xl">
            Serie A <span className="ml-1.5 text-xs font-semibold opacity-60">26/27</span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <CalendarNavBar teams={teams} />

        {session.signedIn && !fixturesLoading && !fixturesError && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncTags}
              disabled={syncStatus === 'syncing'}
              className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              {syncStatus === 'syncing' ? 'Syncing…' : 'Sync big match / derby tags to sheet'}
            </button>
            {syncStatus === 'done' && <span className="text-xs text-[#1fd8c9]">Synced ✓</span>}
            {syncStatus && syncStatus !== 'syncing' && syncStatus !== 'done' && (
              <span className="text-xs text-red-300">{syncStatus}</span>
            )}
          </div>
        )}

        {updateError && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200">
            {updateError}
          </p>
        )}

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
