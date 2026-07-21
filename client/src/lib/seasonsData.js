import { createSheetTabClient } from './sheetTab.js';

// The season list itself - which labels exist, which archive fixtures tab
// each maps to (blank for the live season), and which one is current. Kept
// in the sheet rather than hardcoded so a season rolling over (or a new
// archive season being registered) doesn't require a code change/redeploy -
// though creating that season's actual `fixtures_XX_YY` tab is still a
// manual sheet step either way, same as always.
const client = createSheetTabClient({
  sheetName: 'seasons',
  idField: 'label',
  autoIncrementId: false,
  booleanFields: ['current'],
});

export const fetchSeasons = client.fetchAll;
