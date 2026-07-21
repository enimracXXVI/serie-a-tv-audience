import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeamSettingsPanel from './TeamSettingsPanel.jsx';
import OtherClubsPanel from './OtherClubsPanel.jsx';
import SeasonTeamAttributesPanel from './SeasonTeamAttributesPanel.jsx';
import BroadcastersPanel from './BroadcastersPanel.jsx';
import CompetitionsPanel from './CompetitionsPanel.jsx';
import AppSettingsPanel from './AppSettingsPanel.jsx';
import CollapsibleSection from './CollapsibleSection.jsx';
import { useSession } from '../lib/useSession.jsx';

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
const VIEW_DEPTH = { main: 1, settings: 2 };

// Menu open/closed and submenu state is mirrored into browser history (via
// pushState + a popstate listener) so the hardware/browser back button
// closes the menu - or steps back to the main menu from a submenu - instead
// of navigating the underlying page away.
export default function HamburgerMenu() {
  const [view, setView] = useState('closed'); // 'closed' | 'main' | 'settings'
  // Keeps whatever content was last showing rendered during the close
  // transition, so the drawer slides away with its last screen still in it
  // instead of going blank the instant `view` becomes 'closed'.
  const [displayedView, setDisplayedView] = useState('main');
  const [visible, setVisible] = useState(false); // still in the DOM (mid close-transition)
  const [mounted, setMounted] = useState(false); // slid/faded into the "open" position
  const pushedLevels = useRef(0);
  const session = useSession();
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

  function viewAllTeams() {
    pushedLevels.current = 0;
    setView('closed');
    navigate('/');
  }

  function viewStandings() {
    pushedLevels.current = 0;
    setView('closed');
    navigate('/standings');
  }

  function viewDashboard() {
    pushedLevels.current = 0;
    setView('closed');
    navigate('/dashboard');
  }

  function viewCupCompetitions() {
    pushedLevels.current = 0;
    setView('closed');
    navigate('/cup');
  }

  const open = view !== 'closed';

  return (
    <>
      {!session.signedIn && (
        <button
          onClick={session.signIn}
          className="fixed right-16 top-3 z-[60] rounded-full bg-[#1fd8c9] px-3 py-2 text-xs font-bold text-[#0f1e54] hover:brightness-95"
        >
          Sign in
        </button>
      )}
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
              {displayedView === 'settings' ? (
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
                        Sign in
                      </button>
                    )}
                  </div>

                  <nav className="flex flex-col gap-1">
                    <button
                      onClick={viewAllTeams}
                      className="flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
                    >
                      Fixtures <span aria-hidden="true">›</span>
                    </button>
                    <button
                      onClick={viewStandings}
                      className="flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
                    >
                      Standings <span aria-hidden="true">›</span>
                    </button>
                    <button
                      onClick={viewDashboard}
                      className="flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
                    >
                      Dashboard <span aria-hidden="true">›</span>
                    </button>
                    <button
                      onClick={viewCupCompetitions}
                      className="flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
                    >
                      Cups <span aria-hidden="true">›</span>
                    </button>
                    {session.signedIn && (
                      <button
                        onClick={() => pushView('settings')}
                        className="flex items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
                      >
                        Settings <span aria-hidden="true">›</span>
                      </button>
                    )}
                  </nav>
                </div>
              )}

              {displayedView === 'settings' && (
                <div className="flex flex-col gap-6">
                  <CollapsibleSection title="Serie A clubs">
                    <TeamSettingsPanel session={session} />
                  </CollapsibleSection>
                  <div className="border-t border-white/10 pt-6">
                    <CollapsibleSection title="Other clubs">
                      <OtherClubsPanel session={session} />
                    </CollapsibleSection>
                  </div>
                  <div className="border-t border-white/10 pt-6">
                    <CollapsibleSection title="Past-season sponsorship / big match / derby">
                      <SeasonTeamAttributesPanel session={session} />
                    </CollapsibleSection>
                  </div>
                  <div className="border-t border-white/10 pt-6">
                    <CollapsibleSection title="Serie A logo">
                      <AppSettingsPanel session={session} />
                    </CollapsibleSection>
                  </div>
                  <div className="border-t border-white/10 pt-6">
                    <CollapsibleSection title="Competitions">
                      <CompetitionsPanel session={session} />
                    </CollapsibleSection>
                  </div>
                  <div className="border-t border-white/10 pt-6">
                    <CollapsibleSection title="Broadcasters">
                      <BroadcastersPanel session={session} />
                    </CollapsibleSection>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
