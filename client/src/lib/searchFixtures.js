// Powers the Fixtures search box - a single free-text query is tried against
// several interpretations in order (most specific first) and the first one
// that actually matches something wins, rather than requiring the user to
// pick a search "mode".
const CONNECTOR_RE = /\s+(?:vs\.?|v\.?)\s+|\s*[-–,/]\s*/i;

function teamHay(team) {
  return `${team?.name ?? ''} ${team?.short ?? ''}`.toLowerCase();
}

function teamMatches(team, token) {
  const t = token.trim().toLowerCase();
  return t.length > 0 && teamHay(team).includes(t);
}

function twoSidedMatches(fixtures, a, b) {
  return fixtures.filter(
    (f) => (teamMatches(f.home, a) && teamMatches(f.away, b)) || (teamMatches(f.home, b) && teamMatches(f.away, a))
  );
}

function formatDateForSearch(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase();
}

export function searchFixtures(fixtures, rawQuery) {
  const query = (rawQuery ?? '').trim();
  if (!query) return [];

  // A bare number - "12" means Matchday 12, not a team or a date.
  if (/^\d+$/.test(query)) {
    const md = Number(query);
    const hits = fixtures.filter((f) => f.matchday === md);
    if (hits.length) return hits;
  }

  // Two teams with an explicit connector - "Juventus vs Milan", "Juventus-Milan".
  if (CONNECTOR_RE.test(query)) {
    const [a, b] = query
      .split(CONNECTOR_RE)
      .map((s) => s.trim())
      .filter(Boolean);
    if (a && b) {
      const hits = twoSidedMatches(fixtures, a, b);
      if (hits.length) return hits;
    }
  }

  // Two teams typed with just a space - "Juventus Milan". Tried as every
  // contiguous word split (prefix/suffix) so a multi-word club name on
  // either side ("Hellas Verona Inter") still resolves correctly.
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const hits = twoSidedMatches(fixtures, a, b);
      if (hits.length) return hits;
    }
  }

  // A date - "12 May", "2027-05-12" - matched against both the raw ISO
  // value and the same short format shown on every fixture row.
  const q = query.toLowerCase();
  const dateHits = fixtures.filter((f) => (f.date ?? '').toLowerCase().includes(q) || formatDateForSearch(f.date).includes(q));
  if (dateHits.length) return dateHits;

  // Fallback: one team's name/short code, on either side.
  return fixtures.filter((f) => teamMatches(f.home, query) || teamMatches(f.away, query));
}
