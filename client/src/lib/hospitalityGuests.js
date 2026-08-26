import { createSheetTabClient } from './sheetTab.js';

// One row per guest PER MATCH (not one row per guest overall) - a guest
// attending three matches in the same batch gets three rows here, each with
// its own fixtureId. Deliberately denormalized (home/away/date/kickoff are
// copied in at entry time rather than looked up from the fixture) so a row
// - and the CSV built from it - stays accurate even if that fixture is
// edited afterwards, and so the CSV needs no joins to be forwardable as-is.
const client = createSheetTabClient({
  sheetName: 'hospitalityGuests',
  idField: 'id',
  autoIncrementId: true,
  numericFields: ['id', 'matchday', 'fixtureId'],
});

export const fetchHospitalityGuests = client.fetchAll;
export const updateHospitalityGuest = client.updateRow;
export const appendHospitalityGuest = client.appendRow;
export const deleteHospitalityGuest = client.deleteRow;
