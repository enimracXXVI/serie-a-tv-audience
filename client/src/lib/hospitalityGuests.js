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
  // matchDate/kickoffTime are written as ="..." formulas, not literal RAW
  // text - confirmed directly against this spreadsheet that Sheets still
  // re-interprets a RAW-submitted "YYYY-MM-DD"/"HH:MM" string as a numeric
  // date/time serial despite RAW's documented "stored as-is" behavior, so
  // only a formula's unambiguous string result actually survives (see
  // textFormulaFields in sheetTab.js).
  textFormulaFields: ['matchDate', 'kickoffTime'],
});

export const fetchHospitalityGuests = client.fetchAll;
export const updateHospitalityGuest = client.updateRow;
export const batchUpdateHospitalityGuests = client.updateRows;
export const forceHospitalityTextColumns = client.forceTextColumns;
export const appendHospitalityGuest = client.appendRow;
export const deleteHospitalityGuest = client.deleteRow;
