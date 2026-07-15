import { useCallback, useState } from 'react';
import { getStoredSession, signIn as googleSignIn, signOut as googleSignOut } from './googleAuth.js';

export function useSession() {
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

  return {
    loading: false,
    signedIn: Boolean(session?.accessToken),
    login: session?.email ?? null,
    accessToken: session?.accessToken ?? null,
    signIn,
    signOut,
  };
}
