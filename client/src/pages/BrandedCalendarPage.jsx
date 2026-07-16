import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Crest from '../components/Crest.jsx';
import CalendarView from '../components/CalendarView.jsx';
import TeamCalendarView from '../components/TeamCalendarView.jsx';
import { useTeams } from '../lib/useTeams.jsx';
import { useFixtures } from '../lib/useFixtures.js';
import { themeGradient, contrastText } from '../lib/color.js';
import { FIXTURE_FILTERS, applyFixtureFilters } from '../lib/fixtureFilters.js';

// Team calendars are view-only - editing (scores, audience, sponsorship
// activity) only happens from the home page's full calendar.
export default function BrandedCalendarPage() {
  const { teams: slugsParam } = useParams();
  const navigate = useNavigate();
  const slugs = useMemo(
    () => (slugsParam ?? '').split(',').filter(Boolean),
    [slugsParam]
  );
  const { teams, loading: teamsLoading } = useTeams();
  const { fixtures, loading: fixturesLoading, error: fixturesError } = useFixtures(slugs, teams);
  const [activeFilters, setActiveFilters] = useState([]);
  const filteredFixtures = useMemo(() => applyFixtureFilters(fixtures, activeFilters), [fixtures, activeFilters]);
  function toggleFilter(key) {
    setActiveFilters((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const selectedTeams = useMemo(
    () => slugs.map((s) => teams.find((t) => t.slug === s)).filter(Boolean),
    [slugs, teams]
  );

  // The full set of clubs the header's pills offer to toggle - stays put as
  // clubs are added/removed via the pills themselves, but resets whenever the
  // user arrives here some other way (a fresh /calendar/... navigation).
  const [pillSlugs, setPillSlugs] = useState(slugs);
  const internalNavRef = useRef(false);
  useEffect(() => {
    if (internalNavRef.current) {
      internalNavRef.current = false;
      return;
    }
    setPillSlugs(slugs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs]);
  const pillTeams = useMemo(
    () => pillSlugs.map((s) => teams.find((t) => t.slug === s)).filter(Boolean),
    [pillSlugs, teams]
  );

  function toggleTeamInView(slug) {
    const next = slugs.includes(slug) ? slugs.filter((s) => s !== slug) : [...slugs, slug];
    if (next.length === 0) return;
    internalNavRef.current = true;
    navigate(`/calendar/${next.join(',')}`, { replace: true });
  }

  const gradient = themeGradient(selectedTeams.map((t) => t.primary));
  const accent = selectedTeams[0]?.primary ?? '#00a651';
  const headerText = contrastText(selectedTeams[0]?.primary ?? '#1a1030');

  useEffect(() => {
    document.title = selectedTeams.length
      ? `${selectedTeams.map((t) => t.name).join(' & ')} · Serie A Calendar`
      : 'Serie A Calendar';
  }, [selectedTeams]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 px-6 py-3" style={{ background: gradient }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs font-semibold uppercase tracking-wide opacity-70 hover:opacity-100"
              style={{ color: headerText }}
            >
              ← All teams
            </Link>
            {selectedTeams.length === 1 && <Crest team={selectedTeams[0]} size={26} />}
            <h1 className="text-lg font-black sm:text-xl" style={{ color: headerText }}>
              {selectedTeams.length === 1 ? selectedTeams[0].name : 'Combined Calendar'}
              <span className="ml-1.5 text-xs font-semibold opacity-60">26/27</span>
            </h1>
          </div>

          {pillTeams.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {pillTeams.map((t) => {
                const active = slugs.includes(t.slug);
                return (
                  <button
                    key={t.slug}
                    onClick={() => toggleTeamInView(t.slug)}
                    title={active ? `Remove ${t.name} from this view` : `Add ${t.name} to this view`}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 backdrop-blur-sm transition-all ${
                      active ? 'bg-black/25 hover:bg-black/35' : 'bg-black/5 opacity-40 hover:opacity-70'
                    }`}
                  >
                    <Crest team={t} size={18} />
                    <span className="text-xs font-bold" style={{ color: headerText }}>
                      {t.short ?? t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {!teamsLoading && !fixturesLoading && !fixturesError && fixtures.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {FIXTURE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => toggleFilter(f.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  activeFilters.includes(f.key)
                    ? 'bg-[#1fd8c9] text-[#0f1e54]'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {f.label}
              </button>
            ))}
            {activeFilters.length > 0 && (
              <button
                onClick={() => setActiveFilters([])}
                className="px-2 text-xs font-semibold text-white/40 hover:text-white/70"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {teamsLoading || fixturesLoading ? (
          <p className="text-white/40 text-sm">Loading calendar…</p>
        ) : fixturesError ? (
          <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">
            {fixturesError}
          </p>
        ) : selectedTeams.length === 1 ? (
          <TeamCalendarView fixtures={filteredFixtures} team={selectedTeams[0]} accent={accent} />
        ) : (
          <CalendarView fixtures={filteredFixtures} highlightSlugs={slugs} accent={accent} canEdit={false} />
        )}
      </main>
    </div>
  );
}
