import { useEffect, useState } from 'react';
import { getTeams } from './api.js';

export function useTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeams()
      .then(setTeams)
      .finally(() => setLoading(false));
  }, []);

  return { teams, loading };
}
