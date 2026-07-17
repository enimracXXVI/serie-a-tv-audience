import { GOOGLE_CLIENT_ID } from './config.js';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email';
const STORAGE_KEY = 'serieATvAudience.googleSession';

let gisLoadPromise = null;

function loadGis() {
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.expiresAt || Date.now() >= data.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function storeSession(data) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function fetchProfile(accessToken) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function getStoredSession() {
  return readStoredSession();
}

// A near-simultaneous edit in two different fields each hits the expired
// token and calls this independently - without sharing one in-flight
// request, that's two competing requestAccessToken() popups/silent flows
// stepping on each other, and one edit silently never gets its token (the
// "have to press it again" bug). Sharing a single in-flight promise means
// every caller during that window awaits the same result instead.
let signInPromise = null;

export async function signIn() {
  if (signInPromise) return signInPromise;
  signInPromise = requestAccessToken().finally(() => {
    signInPromise = null;
  });
  return signInPromise;
}

async function requestAccessToken() {
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: async (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        const expiresAt = Date.now() + (Number(response.expires_in) || 3600) * 1000;
        const profile = await fetchProfile(response.access_token);
        const session = {
          accessToken: response.access_token,
          expiresAt,
          email: profile?.email ?? null,
        };
        storeSession(session);
        resolve(session);
      },
    });
    client.requestAccessToken();
  });
}

export function signOut() {
  const session = readStoredSession();
  sessionStorage.removeItem(STORAGE_KEY);
  if (session?.accessToken && window.google?.accounts?.oauth2?.revoke) {
    window.google.accounts.oauth2.revoke(session.accessToken, () => {});
  }
}
