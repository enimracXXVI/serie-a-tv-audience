import { useCallback, useEffect, useState } from 'react';
import {
  fetchHospitalityGuests,
  appendHospitalityGuest,
  updateHospitalityGuest,
  deleteHospitalityGuest,
} from './hospitalityGuests.js';

// Local to HospitalityPage (not a shared Context like ClubsProvider/
// TeamSeasonsProvider) - guest data isn't needed anywhere else in the app,
// so there's nothing to gain from making it globally available. Mirrors
// useCupFixtures.js's own create/delete shape: callers pass an accessToken
// they've already resolved via callWithReauth, this hook doesn't reach for
// the session itself.
export function useHospitalityGuests() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchHospitalityGuests()
      .then((rows) => {
        if (!cancelled) setGuests(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addGuest = useCallback(async (fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { item } = await appendHospitalityGuest(fields, accessToken);
    setGuests((prev) => [...prev, item]);
    return item;
  }, []);

  // Only the guest's own personal-info fields are ever passed in here (see
  // GuestForm's edit mode) - the match fields a row was created with
  // (fixtureId, homeTeam, matchDate, ...) never change on an edit, so a
  // plain client-side merge is accurate without refetching the row.
  const updateGuest = useCallback(async (id, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    await updateHospitalityGuest(id, fields, accessToken);
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...fields } : g)));
  }, []);

  const removeGuest = useCallback(async (id, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    // Deleting actually shifts every row below it up by one - the response
    // is the freshly refetched, post-delete list, same as every other
    // tab's deleteRow.
    const rows = await deleteHospitalityGuest(id, accessToken);
    setGuests(rows);
  }, []);

  return { guests, loading, error, addGuest, updateGuest, removeGuest };
}
