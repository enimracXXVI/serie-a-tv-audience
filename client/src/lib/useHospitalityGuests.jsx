import { useCallback, useEffect, useState } from 'react';
import {
  fetchHospitalityGuests,
  appendHospitalityGuest,
  updateHospitalityGuest,
  batchUpdateHospitalityGuests,
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
  // plain client-side merge is accurate without refetching the row. (The
  // legacy repair pass that DOES touch those match fields goes through
  // batchUpdateGuests below, not this.)
  //
  // updateHospitalityGuest resolves without throwing even when a requested
  // field's column header wasn't found - it just didn't write that one
  // field, and says so via missingFields, so the other fields in the same
  // write still apply. Merging every requested field into local state
  // regardless would make the UI claim a field was saved when the sheet
  // never actually got it.
  const updateGuest = useCallback(async (id, fields, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { missingFields } = await updateHospitalityGuest(id, fields, accessToken);
    const missingHere = (missingFields ?? []).filter((f) => f in fields);
    const applied = { ...fields };
    for (const f of missingHere) delete applied[f];
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...applied } : g)));
    if (missingHere.length > 0) {
      throw new Error(`Saved, but the hospitalityGuests sheet has no column header for: ${missingHere.join(', ')}.`);
    }
  }, []);

  // Bulk counterpart for a repair pass over many rows at once (see
  // HospitalityPage's "Fix now" banner) - one Sheets request for the whole
  // batch instead of one per row, since the latter reliably trips Sheets'
  // per-minute write quota partway through a few hundred rows. Same
  // missingFields-aware merge as updateGuest, per row.
  const batchUpdateGuests = useCallback(async (updates, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    const { results } = await batchUpdateHospitalityGuests(updates, accessToken);
    const fieldsById = new Map(updates.map((u) => [u.id, u.fields]));
    const resultById = new Map(results.map((r) => [r.id, r]));
    setGuests((prev) =>
      prev.map((g) => {
        const fields = fieldsById.get(g.id);
        if (!fields) return g;
        const missingHere = resultById.get(g.id)?.missingFields ?? [];
        const applied = { ...fields };
        for (const f of missingHere) delete applied[f];
        return { ...g, ...applied };
      })
    );
    return results;
  }, []);

  // Re-reads the tab from Sheets, replacing local state outright - used
  // after a batch write to confirm, against the sheet itself rather than
  // the optimistic local merge above, which rows actually stuck.
  const refetch = useCallback(async () => {
    const rows = await fetchHospitalityGuests();
    setGuests(rows);
    return rows;
  }, []);

  const removeGuest = useCallback(async (id, accessToken) => {
    if (!accessToken) throw new Error('UNAUTHENTICATED');
    // Deleting actually shifts every row below it up by one - the response
    // is the freshly refetched, post-delete list, same as every other
    // tab's deleteRow.
    const rows = await deleteHospitalityGuest(id, accessToken);
    setGuests(rows);
  }, []);

  return { guests, loading, error, addGuest, updateGuest, batchUpdateGuests, refetch, removeGuest };
}
