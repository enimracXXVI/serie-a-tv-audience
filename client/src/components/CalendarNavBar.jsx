import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamPicker from './TeamPicker.jsx';
import { getSavedTeams, saveTeams } from '../lib/savedTeams.js';

// The three ways to get to a calendar (all teams, sponsored teams, a custom
// build) - shown on every calendar page, not just the home page, so
// switching views never requires going back through the hamburger menu.
export default function CalendarNavBar({ teams }) {
  const navigate = useNavigate();
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

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => navigate('/')}
          className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/25"
        >
          All teams
        </button>
        <button
          onClick={viewAllSponsored}
          disabled={sponsoredSlugs.length === 0}
          title={sponsoredSlugs.length === 0 ? 'No clubs marked as sponsored yet - set that in Settings' : undefined}
          className="rounded-full bg-[#1fd8c9]/20 px-3 py-1.5 text-xs font-bold text-[#1fd8c9] transition-colors hover:bg-[#1fd8c9]/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1fd8c9]/20"
        >
          Sponsored teams →
        </button>
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
    </>
  );
}
