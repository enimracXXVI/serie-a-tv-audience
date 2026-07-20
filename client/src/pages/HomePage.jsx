import { useState } from 'react';
import CalendarView from '../components/CalendarView.jsx';
import CalendarNavBar from '../components/CalendarNavBar.jsx';
import AddSerieAFixtureForm from '../components/AddSerieAFixtureForm.jsx';
import SeasonSelector from '../components/SeasonSelector.jsx';
import { useSeasonFixtures } from '../lib/useSeasonFixtures.js';
import { useTeams } from '../lib/useTeams.jsx';
import { useSession } from '../lib/useSession.js';
import { useAppSettings } from '../lib/useAppSettings.jsx';
import { callWithReauth } from '../lib/reauth.js';
import { CURRENT_SEASON } from '../lib/seasons.js';

export default function HomePage() {
  const { teams } = useTeams();
  const [season, setSeason] = useState(CURRENT_SEASON);
  const {
    fixtures,
    loading: fixturesLoading,
    error: fixturesError,
    canEdit: seasonCanEdit,
    updateFixture,
    createFixture,
  } = useSeasonFixtures(season, teams);
  const session = useSession();
  const canEdit = session.signedIn && seasonCanEdit;
  const { serieALogoUrl } = useAppSettings();
  const [updateError, setUpdateError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleUpdate(id, fields) {
    try {
      await callWithReauth(session, (token) => updateFixture(id, fields, token));
      setUpdateError(null);
    } catch (err) {
      setUpdateError(err.message);
    }
  }

  async function handleCreate(fields) {
    await callWithReauth(session, (token) => createFixture(fields, token));
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 pr-36">
          <h1 className="flex items-center gap-2 text-lg font-black text-white sm:text-xl">
            {serieALogoUrl && <img src={serieALogoUrl} alt="" className="h-6 w-auto object-contain sm:h-7" />}
            Serie A
          </h1>
          <SeasonSelector season={season} onChange={setSeason} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <CalendarNavBar teams={teams} />

        {!seasonCanEdit && (
          <p className="mb-4 rounded-lg bg-white/5 px-4 py-2.5 text-xs text-white/50">
            {season.label} is a past season - view only, nothing here can be edited.
          </p>
        )}

        {canEdit && !fixturesLoading && !fixturesError && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                showAddForm ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Add fixture {showAddForm ? '▴' : '▾'}
            </button>
          </div>
        )}

        {canEdit && showAddForm && (
          <div className="mb-4">
            <AddSerieAFixtureForm teams={teams} onCreate={handleCreate} />
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
          <CalendarView fixtures={fixtures} onUpdate={handleUpdate} canEdit={canEdit} />
        )}
      </main>
    </div>
  );
}
