import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamPicker from '../components/TeamPicker.jsx';
import CalendarView from '../components/CalendarView.jsx';
import { useTeams } from '../lib/useTeams.js';
import { useFixtures } from '../lib/useFixtures.js';

export default function HomePage() {
  const { teams, loading: teamsLoading } = useTeams();
  const { fixtures, loading: fixturesLoading, updateFixture } = useFixtures([]);
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();

  function toggle(slug) {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function viewCalendar() {
    if (selected.length === 0) return;
    navigate(`/calendar/${selected.join(',')}`);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-gradient-to-br from-[#11141b] to-[#1a1030] px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/80">
            Serie A · 2026/27
          </p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">TV Audience Tracker</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Full-season calendar with results, DAZN and Sky audience. Pick one or more clubs below to get a
            branded calendar just for them.
          </p>
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
          ) : (
            <CalendarView fixtures={fixtures} onUpdate={updateFixture} />
          )}
        </section>
      </main>
    </div>
  );
}
