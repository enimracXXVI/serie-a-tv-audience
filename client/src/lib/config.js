// Non-secret identifiers for the Google Sheets backend. An API key and an
// OAuth Client ID are not secrets in the way a client *secret* is - both are
// safe to ship in client-side code (the API key is quota/referrer-restricted,
// the OAuth Client ID is a public identifier, same idea as GitHub's Client ID).
export const SPREADSHEET_ID = '1h3ZN2H5_ISzLUCW_AtbP2nFSRoMf7htwL8PYYAtRq4o';

// The tab name inside the spreadsheet holding the fixtures. Check the tab
// label at the bottom of the sheet and update this if it isn't "Sheet1".
export const SHEET_NAME = 'Sheet1';

// Fill these in after creating them in Google Cloud Console (see README).
export const GOOGLE_API_KEY = 'REPLACE_WITH_YOUR_GOOGLE_API_KEY';
export const GOOGLE_CLIENT_ID = 'REPLACE_WITH_YOUR_GOOGLE_OAUTH_CLIENT_ID';
