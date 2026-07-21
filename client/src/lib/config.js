// Non-secret identifiers for the Google Sheets backend. An API key and an
// OAuth Client ID are not secrets in the way a client *secret* is - both are
// safe to ship in client-side code (the API key is quota/referrer-restricted,
// the OAuth Client ID is a public identifier, same idea as GitHub's Client ID).
export const SPREADSHEET_ID = '1h3ZN2H5_ISzLUCW_AtbP2nFSRoMf7htwL8PYYAtRq4o';

// Fill these in after creating them in Google Cloud Console (see README).
export const GOOGLE_API_KEY = 'AIzaSyDr9C0S7FaRckKh4ZeNmnxjOWnU0WyrhVg';
export const GOOGLE_CLIENT_ID = '469039071101-9mj46erho7lok1om9uuevtgn1j2p5q8u.apps.googleusercontent.com';
