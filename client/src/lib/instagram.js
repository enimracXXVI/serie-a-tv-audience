// Strips a pasted profile URL ("https://instagram.com/name", "instagram.com/
// name/", "www.instagram.com/name") or a leading "@" down to the bare
// handle, so the stored value is always just "name" regardless of how it
// was typed - instagramUrl below then always builds the same link from it.
export function normalizeInstagramHandle(input) {
  if (!input) return '';
  let handle = input.trim();
  handle = handle.replace(/^https?:\/\//i, '').replace(/^(www\.)?instagram\.com\//i, '');
  handle = handle.replace(/^@/, '');
  handle = handle.replace(/\/.*$/, '');
  return handle.trim();
}

export function instagramUrl(handle) {
  return handle ? `https://instagram.com/${handle}` : '';
}
