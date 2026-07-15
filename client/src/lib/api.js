const BASE = '/api';

export async function getTeams() {
  const res = await fetch(`${BASE}/teams`);
  if (!res.ok) throw new Error('Failed to load teams');
  return res.json();
}

export async function getFixtures(teamSlugs = []) {
  const qs = teamSlugs.length ? `?teams=${teamSlugs.join(',')}` : '';
  const res = await fetch(`${BASE}/fixtures${qs}`);
  if (!res.ok) throw new Error('Failed to load fixtures');
  return res.json();
}

export async function patchFixture(id, fields) {
  const res = await fetch(`${BASE}/fixtures/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (res.status === 401) throw new Error('UNAUTHENTICATED');
  if (!res.ok) throw new Error('Failed to update fixture');
  return res.json();
}

export async function getSession() {
  const res = await fetch(`${BASE}/auth/me`, { credentials: 'include' });
  if (!res.ok) return { login: null };
  return res.json();
}

export async function logout() {
  await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
}
