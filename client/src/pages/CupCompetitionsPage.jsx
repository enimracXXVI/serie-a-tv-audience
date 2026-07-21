import { useMemo, useState } from 'react';
import { useTeams } from '../lib/useTeams.jsx';
import { useCupData } from '../lib/useCupData.jsx';
import { useCupFixtures } from '../lib/useCupFixtures.js';
import { useSession } from '../lib/useSession.js';
import { callWithReauth } from '../lib/reauth.js';
import { CURRENT_SEASON } from '../lib/seasons.js';
import SeasonSelector from '../components/SeasonSelector.jsx';
import CupFixtureRow from '../components/CupFixtureRow.jsx';
import CupTieGroup from '../components/CupTieGroup.jsx';
import AddCupFixtureForm from '../components/AddCupFixtureForm.jsx';
import { groupIntoTies, tieKeyFor } from '../lib/cupFixtures.js';

export default function CupCompetitionsPage() {
  const { teams } = useTeams();
  const { cupTeams, broadcasters, competitions, loading: cupDataLoading, createCupTeam } = useCupData();
  const [season, setSeason] = useState(CURRENT_SEASON);
  const { fixtures, loading: fixturesLoading, error: fixturesError, updateFixture, createFixture } = useCupFixtures(
    teams,
    cupTeams,
    season
  );
  const session = useSession();
  const [showAddForm, setShowAddForm] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  // Past cup seasons are frozen once they're no longer current - same
  // precedent as Serie A's archive tabs - backfilling an already-completed
  // season is a direct sheet paste (see README) instead.
  const canEdit = session.signedIn && season.label === CURRENT_SEASON.label;

  const loading = cupDataLoading || fixturesLoading;

  const grouped = useMemo(() => {
    const byCompetition = new Map();
    for (const f of fixtures) {
      if (!byCompetition.has(f.competition)) byCompetition.set(f.competition, new Map());
      const byRound = byCompetition.get(f.competition);
      const key = f.round || 'Round TBD';
      if (!byRound.has(key)) byRound.set(key, []);
      byRound.get(key).push(f);
    }
    return byCompetition;
  }, [fixtures]);

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

  async function handleCreateOpponent(fields) {
    await callWithReauth(session, (token) => createCupTeam(fields, token));
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-[#0a1440] to-[#16297a] px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 pr-36">
          <h1 className="text-lg font-black text-white sm:text-xl">
            Cups <span className="ml-1.5 text-xs font-semibold opacity-60">{season.label}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <SeasonSelector season={season} onChange={setSeason} />
            {canEdit && (
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  showAddForm ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Add fixture {showAddForm ? '▴' : '▾'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        {season.label !== CURRENT_SEASON.label && (
          <p className="rounded-lg bg-white/5 px-4 py-2.5 text-xs text-white/50">
            {season.label} is a past season - view only, nothing here can be edited.
          </p>
        )}

        {canEdit && showAddForm && (
          <AddCupFixtureForm
            teams={teams}
            cupTeams={cupTeams}
            competitions={competitions}
            onCreate={handleCreate}
            onCreateOpponent={handleCreateOpponent}
          />
        )}

        {updateError && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200">{updateError}</p>
        )}

        {loading ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : fixturesError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{fixturesError}</p>
        ) : fixtures.length === 0 ? (
          <p className="text-sm text-white/40">
            No cup fixtures yet - sign in and use “Add fixture” above, or add a row directly to the cupFixtures sheet tab.
          </p>
        ) : (
          competitions
            .filter((c) => grouped.has(c.value))
            .map((c) => (
              <div key={c.value} className="flex flex-col gap-3">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white/60">
                  {c.logoUrl && <img src={c.logoUrl} alt="" className="h-4 max-w-[60px] object-contain" />}
                  {c.label}
                </h2>
              {[...grouped.get(c.value).entries()].map(([round, roundFixtures]) => (
                <div key={round} className="overflow-hidden rounded-2xl shadow-lg shadow-black/20">
                  <div className="bg-[#0f1e54] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white/70">{round}</div>
                  <div className="flex flex-col divide-y divide-gray-100">
                    {groupIntoTies(roundFixtures).map((legs) =>
                      legs.length === 2 ? (
                        <CupTieGroup
                          key={tieKeyFor(legs[0])}
                          legs={legs}
                          onUpdate={handleUpdate}
                          canEdit={canEdit}
                          broadcasters={broadcasters}
                        />
                      ) : (
                        legs.map((f) => (
                          <CupFixtureRow
                            key={f.id}
                            fixture={f}
                            onUpdate={handleUpdate}
                            canEdit={canEdit}
                            broadcasters={broadcasters}
                          />
                        ))
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
