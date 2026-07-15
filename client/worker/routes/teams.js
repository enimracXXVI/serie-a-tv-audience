import { teams } from '../_shared/teams.js';

export function handleTeams() {
  return new Response(JSON.stringify(teams), {
    headers: { 'Content-Type': 'application/json' },
  });
}
