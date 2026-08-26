// ~7,900 Italian comuni grouped by province (matteocontrini/comuni-json,
// MIT licensed, ISTAT-derived) - too large and too prone to drift (comune
// mergers happen) for anything but a real dataset, unlike the small/stable
// nations and provinces lists. Lazy-loaded (not a static import) so this
// ~110KB JSON only ever gets fetched by someone who actually opens the
// Hospitality guest form and picks Italy, not bundled into everyone else's
// initial page load.
let cache = null;

export async function fetchComuniByProvince() {
  if (!cache) {
    cache = import('./italianComuniByProvince.json').then((mod) => mod.default);
  }
  return cache;
}

export async function comuniForProvince(province) {
  const byProvince = await fetchComuniByProvince();
  return byProvince[province] ?? [];
}
