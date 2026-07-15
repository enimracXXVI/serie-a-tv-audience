import { teams } from '../_shared/teams.js';

export async function onRequestGet() {
  return new Response(JSON.stringify(teams), {
    headers: { 'Content-Type': 'application/json' },
  });
}
