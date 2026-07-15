const KEY = 'serieATvAudience.myTeams';

export function getSavedTeams() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTeams(slugs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    // ignore (e.g. private browsing with storage disabled)
  }
}
