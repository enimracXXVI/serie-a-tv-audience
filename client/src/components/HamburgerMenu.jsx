import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamPicker from './TeamPicker.jsx';
import TeamSettingsPanel from './TeamSettingsPanel.jsx';
import { useTeams } from '../lib/useTeams.jsx';
import { useSession } from '../lib/useSession.js';
import { getSavedTeams, saveTeams } from '../lib/savedTeams.js';

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// How many history entries each view sits behind the closed menu - used to
// know how many popstate levels to unwind when closing programmatically.
const VIEW_DEPTH = { main: 1, teams: 2, settings: 2 };

// Menu open/closed and submenu state is mirrored into browser history (via
// pushState + a popstate listener) so the hardware/browser back button
// closes the menu - or steps back to the main menu from a submenu - instead
// of navigating the underlying page away.
export default function HamburgerMenu() {
  const [view, setView] = useState('closed'); // 'closed' | 'main' | 'teams' | 'settings'
  // Keeps whatever content was last showing rendered during the close
  // transition, so the drawer slides away with its last screen still in it
  // instead of going blank the instant `view` becomes 'closed'.
  const [displayedView, setDisplayedView] = useState('main');
  const [visible, setVisible] = useState(false); // still in the DOM (mid close-transition)
  const [mounted, setMounted] = useState(false); // slid/faded into the "open" position
  const pushedLevels = useRef(0);
  const session = useSession();
  const { teams } = useTeams();
  const [selectedTeams, setSelectedTeams] = useState(() => getSavedTeams());
  const navigate = useNavigate();

  useEffect(() => {
    if (view !== 'closed') setDisplayedView(view);
  }, [view]);

  useEffect(() => {
    function onPopState(e) {
      const v = e.state?.appMenuView ?? 'closed';
      pushedLevels.current = VIEW_DEPTH[v] ?? 0;
      setView(v);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (view === 'closed') {
      setMounted(false);
      const timeout = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timeout);
    }
    setVisible(true);
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [view]);

  function pushView(v) {
    window.history.pushState({ appMenuView: v }, '');
    pushedLevels.current = VIEW_DEPTH[v] ?? 0;
    setView(v);
  }

  function backToMain() {
    window.history.back();
  }

  function closeMenu() {
    if (pushedLevels.current > 0) {
      window.history.go(-pushedLevels.current);
    } else {
      setView('closed');
    }
  }

  function toggleTeam(slug) {
    setSelectedTeams((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      saveTeams(next);
      return next;
    });
  }

  function viewTeamCalendar() {
    if (selectedTeams.length === 0) return;
    pushedLevels.current = 0;
    setView('closed');
    navigate(`/calendar/${selectedTeams.join(',')}`);
  }

  // Jumps straight to a combined view of every sponsored club without
  // touching selectedTeams - "All sponsored teams" is a one-off shortcut,
  // not something that should show up pre-checked in the picker afterwards.
  function viewStandings() {
    pushedLevels.current = 0;
    setView('closed');
    navigate('/standings');
  }

  function viewAllSponsored() {
    const sponsoredSlugs = teams.filter((t) => t.sponsored).map((t) => t.slug);
    if (sponsoredSlugs.length === 0) return;
    pushedLevels.current = 0;
    setView('closed');
    navigate(`/calendar/${sponsoredSlugs.join(',')}`);
  }

  const open = view !== 'closed';

  return (
    <>
      <button
        onClick={open ? closeMenu : () => pushView('main')}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="fixed right-4 top-3 z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-[#1fd8c9]/70 bg-black/30 text-[#1fd8c9] backdrop-blur-sm transition-colors hover:bg-black/45"
      >
        {open ? <CloseIcon /> : <HamburgerIcon />}
      </button>

      {visible && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeMenu}
          />
          <div
            className={`relative flex h-full w-full flex-col bg-[#0f1e54] shadow-2xl transition-transform duration-300 ease-out sm:w-96 ${
              mounted ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center border-b border-white/10 px-5 py-4">
              {displayedView === 'teams' || displayedView === 'settings' ? (
                <button
                  onClick={backToMain}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white"
                >
                  <BackIcon /> Back
                </button>
              ) : (
                <span className="text-sm font-bold uppercase tracking-wide text-white/50">Menu</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {displayedView === 'main' && (
                <div className="flex flex-col gap-6">
                  <div className="rounded-xl bg-white/5 p-4">
                    {session.signedIn ? (
                      <>
                        <p className="text-xs text-white/50">Signed in as</p>
                        <p className="break-words text-sm font-semibold text-white">{session.login}</p>
                        <button
                          onClick={session.signOut}
                          className="mt-3 w-full rounded-md bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
                        >
                          Sign out
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={session.signIn}
                        className="w-full rounded-md bg-[#1fd8c9] px-3 py-2 text-xs font-bold text-[#0f1e54] hover:brightness-95"
                      >
                        Sign in with Google
                      </button>
                    )}
                  </div>

                  <nav className="flex flex-col gap-1">
                    <button
                      onClick={() => pushView('teams')}
                      className="flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
                    >
                      Teams <span aria-hidden="true">›</span>
                    </button>
                    <button
                      onClick={() => pushView('settings')}
                      className="flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
                    >
                      Settings <span aria-hidden="true">›</span>
                    </button>
                    <button
                      onClick={viewStandings}
                      className="flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
                    >
                      Standings <span aria-hidden="true">›</span>
                    </button>
                    <button className="flex cursor-default items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold text-white/40">
                      Dashboard
                    </button>
                  </nav>
                </div>
              )}

              {displayedView === 'teams' && (
                <div className="flex flex-col gap-4">
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
                  {teams.some((t) => t.sponsored) && (
                    <button
                      onClick={viewAllSponsored}
                      className="self-start rounded-full bg-[#1fd8c9]/20 px-3 py-1.5 text-xs font-bold text-[#1fd8c9] transition-colors hover:bg-[#1fd8c9]/30"
                    >
                      All sponsored teams →
                    </button>
                  )}
                  <TeamPicker
                    teams={teams}
                    selected={selectedTeams}
                    onToggle={toggleTeam}
                    gridClassName="grid grid-cols-3 gap-2"
                  />
                </div>
              )}

              {displayedView === 'settings' && <TeamSettingsPanel session={session} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
