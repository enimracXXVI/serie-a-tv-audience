import { useCallback, useEffect, useState } from 'react';
import { getSession, logout as apiLogout } from './api.js';

export function useSession() {
  const [login, setLogin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then((data) => setLogin(data.login))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(() => {
    const next = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/login?next=${encodeURIComponent(next)}`;
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setLogin(null);
  }, []);

  return { login, loading, signedIn: Boolean(login), signIn, signOut };
}
