import { createContext, useCallback, useContext, useState } from 'react';
import { getStoredSession, signIn as googleSignIn, signOut as googleSignOut } from './googleAuth.js';

const SessionContext = createContext(null);

// Shared across the whole app (like TeamsProvider) so signing in from the
// hamburger menu is reflected immediately everywhere canEdit is gated
// (HomePage, CupCompetitionsPage, ...) instead of only in whichever
// component happened to hold its own local session state - previously each
// useSession() call kept its own independent useState, so a sign-in
// elsewhere only took effect after a full page reload remounted everything.
export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());

  const signIn = useCallback(async () => {
    try {
      const s = await googleSignIn();
      setSession(s);
      return s;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  const signOut = useCallback(() => {
    googleSignOut();
    setSession(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        loading: false,
        signedIn: Boolean(session?.accessToken),
        login: session?.email ?? null,
        accessToken: session?.accessToken ?? null,
        signIn,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
