import { useMemo, useState } from 'react';
import { useCupData } from '../lib/useCupData.jsx';
import { useCupFixtures } from '../lib/useCupFixtures.js';
import { useClubs } from '../lib/useClubs.jsx';
import { useSession } from '../lib/useSession.jsx';
import { useSeasonParam } from '../lib/useSeasonParam.js';
import { useSeasons } from '../lib/useSeasons.jsx';
import { SERIE_A_VALUE } from '../lib/competitions.js';
import { callWithReauth } from '../lib/reauth.js';
import SeasonSelector from '../components/SeasonSelector.jsx';
import CupRoundGroup from '../components/CupRoundGroup.jsx';
import AddCupFixtureForm from '../components/AddCupFixtureForm.jsx';

export default function CupCompetitionsPage() {
  const { clubs, createClub } = useClubs();
  const { broadcasters, competitions: allCompetitions, loading: cupDataLoading } = useCupData();
  // Serie A is a real "competitions" row now (for its logo setting - see
  // competitions.js) but isn't a cup - never has cupFixtures of its own and
  // can't be picked as one to add a fixture under.
  const competitions = useMemo(() => allCompetitions.filter((c) => c.value !== SERIE_A_VALUE), [allCompetitions]);
  const [season, setSeason] = useSeasonParam();
  const { currentSeason } = useSeasons();
  const {
    fixtures,
    loading: fixturesLoading,
    error: fixturesError,
    updateFixture,
    createFixture,
    deleteFixture,
  } = useCupFixtures(season);
  const session = useSession();
  const [showAddForm, setShowAddForm] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  // Which competitions are collapsed - starts empty (everything expanded);
  // a competition only enters this set once the user explicitly collapses it.
  const [collapsed, setCollapsed] = useState(() => new Set());

  // Past cup seasons are frozen once they're no longer current - same
  // precedent as Serie A's archive tabs - backfilling an already-completed
  // season is a direct sheet paste (see README) instead.
  const canEdit = session.signedIn && season.label === currentSeason.label;

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

  const visibleCompetitions = competitions.filter((c) => grouped.has(c.value));

  function toggleCollapsed(value) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

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
    await callWithReauth(session, (token) => createClub(fields, token));
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
        {canEdit && showAddForm && (
          <AddCupFixtureForm
            clubs={clubs}
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
          <>
            {visibleCompetitions.length > 1 && (
              <div id="cup-nav" className="scroll-mt-4 flex flex-wrap items-center gap-1.5">
                {visibleCompetitions.map((c) => (
                  <a
                    key={c.value}
                    href={`#competition-${c.value}`}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
                  >
                    {c.logoUrl && <img src={c.logoUrl} alt="" className="h-3.5 max-w-[40px] object-contain" />}
                    {c.label}
                  </a>
                ))}
              </div>
            )}

            {visibleCompetitions.map((c) => {
              const isCollapsed = collapsed.has(c.value);
              return (
                <div key={c.value} id={`competition-${c.value}`} className="scroll-mt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggleCollapsed(c.value)}
                      className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white/60 hover:text-white/80"
                    >
                      <span className={`inline-block text-white/40 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>▾</span>
                      {c.logoUrl && <img src={c.logoUrl} alt="" className="h-4 max-w-[60px] object-contain" />}
                      {c.label}
                    </button>
                    {visibleCompetitions.length > 1 && (
                      <a href="#cup-nav" className="text-xs font-semibold text-white/40 hover:text-white">
                        ↑ Top
                      </a>
                    )}
                  </div>
                  {!isCollapsed &&
                    [...grouped.get(c.value).entries()].map(([round, roundFixtures]) => (
                      <CupRoundGroup
                        key={round}
                        round={round}
                        fixtures={roundFixtures}
                        onUpdate={handleUpdate}
                        onDelete={canEdit ? handleDelete : null}
                        canEdit={canEdit}
                        broadcasters={broadcasters}
                      />
                    ))}
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
