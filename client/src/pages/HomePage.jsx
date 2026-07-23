import { useMemo, useState } from 'react';
import CalendarView from '../components/CalendarView.jsx';
import CalendarNavBar from '../components/CalendarNavBar.jsx';
import AddSerieAFixtureForm from '../components/AddSerieAFixtureForm.jsx';
import SeasonSelector from '../components/SeasonSelector.jsx';
import { useSeasonFixtures } from '../lib/useSeasonFixtures.js';
import { teamsInFixtures } from '../lib/teams.js';
import { useTeams } from '../lib/useTeams.jsx';
import { useSession } from '../lib/useSession.jsx';
import { useCupData } from '../lib/useCupData.jsx';
import { serieALogo } from '../lib/competitions.js';
import { useSeasonParam } from '../lib/useSeasonParam.js';
import { callWithReauth } from '../lib/reauth.js';

export default function HomePage() {
  const { teams } = useTeams();
  const [season, setSeason] = useSeasonParam();
  const {
    fixtures,
    loading: fixturesLoading,
    error: fixturesError,
    canEdit: seasonCanEdit,
    updateFixture,
    createFixture,
    deleteFixture,
  } = useSeasonFixtures(season, teams);
  const session = useSession();
  const canEdit = session.signedIn && seasonCanEdit;
  const { competitions } = useCupData();
  const serieALogoUrl = serieALogo(competitions);
  const [updateError, setUpdateError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // A past season's actual roster isn't necessarily this year's - so that
  // "Build calendar"/"Sponsored teams" (which navigate off to a branded
  // calendar for whichever season is currently being viewed here) offer the
  // right clubs instead of always the live roster.
  const effectiveTeams = useMemo(
    () => (season.current ? teams : teamsInFixtures(fixtures)),
    [season, fixtures, teams]
  );
  const seasonQuery = season.current ? '' : `?season=${season.slug}`;

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

  async function handleDelete(id) {
    try {
      await callWithReauth(session, (token) => deleteFixture(id, token));
      setUpdateError(null);
    } catch (err) {
      setUpdateError(err.message);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 pr-36">
          <h1 className="flex items-center gap-2 text-lg font-black text-white sm:text-xl">
            {serieALogoUrl && <img src={serieALogoUrl} alt="" className="h-6 w-auto object-contain sm:h-7" />}
            Serie A
          </h1>
          <SeasonSelector season={season} onChange={setSeason} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <CalendarNavBar
          teams={effectiveTeams}
          seasonQuery={seasonQuery}
          rightSlot={
            canEdit &&
            !fixturesLoading &&
            !fixturesError && (
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  showAddForm ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Add fixture {showAddForm ? '▴' : '▾'}
              </button>
            )
          }
        />

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
          <CalendarView fixtures={fixtures} onUpdate={handleUpdate} onDelete={canEdit ? handleDelete : null} canEdit={canEdit} />
        )}
      </main>
    </div>
  );
}
