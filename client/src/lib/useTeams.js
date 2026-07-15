import { teams } from './teams.js';

export function useTeams() {
  return { teams, loading: false };
}
