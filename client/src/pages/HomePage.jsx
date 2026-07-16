import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CalendarView from '../components/CalendarView.jsx';
import TeamPicker from '../components/TeamPicker.jsx';
import { useFixtures } from '../lib/useFixtures.js';
import { useTeams } from '../lib/useTeams.jsx';
import { useSession } from '../lib/useSession.js';
import { syncMatchTags } from '../lib/sheets.js';
import { callWithReauth } from '../lib/reauth.js';
import { getSavedTeams, saveTeams } from '../lib/savedTeams.js';

export default function HomePage() {
  const { teams } = useTeams();
  const { fixtures, loading: fixturesLoading, error: fixturesError, updateFixture } = useFixtures([], teams);
  const session = useSession();
  const navigate = useNavigate();
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | 'done' | error message
  const [updateError, setUpdateError] = useState(null);
  const [showBuildPanel, setShowBuildPanel] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState(() => getSavedTeams());
  const sponsoredSlugs = teams.filter((t) => t.sponsored).map((t) => t.slug);

  function toggleTeam(slug) {
    setSelectedTeams((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      saveTeams(next);
      return next;
    });
  }

  function viewTeamCalendar() {
    if (selectedTeams.length === 0) return;
    navigate(`/calendar/${selectedTeams.join(',')}`);
  }

  // A one-off shortcut, like the picker's "View" button - doesn't touch
  // selectedTeams, so it never shows up pre-checked in the picker afterwards.
  function viewAllSponsored() {
    if (sponsoredSlugs.length === 0) return;
    navigate(`/calendar/${sponsoredSlugs.join(',')}`);
  }

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
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white">All teams</span>
          {sponsoredSlugs.length > 0 && (
            <button
              onClick={viewAllSponsored}
              className="rounded-full bg-[#1fd8c9]/20 px-3 py-1.5 text-xs font-bold text-[#1fd8c9] transition-colors hover:bg-[#1fd8c9]/30"
            >
              Sponsored teams →
            </button>
          )}
          <button
            onClick={() => setShowBuildPanel((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              showBuildPanel ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Build calendar {showBuildPanel ? '▴' : '▾'}
          </button>
        </div>

        {showBuildPanel && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">Build a team calendar</h2>
              {selectedTeams.length > 0 && (
                <button
                  onClick={viewTeamCalendar}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black transition-transform hover:scale-105"
                >
                  View ({selectedTeams.length}) →
                </button>
              )}
            </div>
            <TeamPicker teams={teams} selected={selectedTeams} onToggle={toggleTeam} />
          </div>
        )}

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
