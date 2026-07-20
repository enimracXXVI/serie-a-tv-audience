// Past seasons are read-only archives - not sheet-editable settings like
// teams/competitions/broadcasters, since this is a small, rarely-changed
// list (once a year at most). Add a new season here (and create its tab,
// same header row as the live `fixtures` tab) when a new one needs
// archiving. `tab` is null for the current, live season - it reads from
// the same fixtures tab/hook every other page already uses, not an archive.
export const SEASONS = [
  { label: '26/27', tab: null },
  { label: '25/26', tab: 'fixtures_25_26' },
  { label: '24/25', tab: 'fixtures_24_25' },
];

export const CURRENT_SEASON = SEASONS[0];
