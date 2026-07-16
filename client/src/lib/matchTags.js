// Both are fully derived from team-level Settings, never stored per fixture:
// - a big match is any fixture between two clubs both marked "big club"
// - a derby is exclusive: it only counts when each club's designated derby
//   rival IS the other club in this fixture (e.g. Roma's rival is Lazio,
//   not just any other "derby-flagged" club)
export function computeMatchTags(fixture) {
  const { home, away } = fixture;
  const isBigMatch = Boolean(home?.bigClub) && Boolean(away?.bigClub);
  const isDerby = Boolean(
    (home?.derbyRival && home.derbyRival === away?.slug) || (away?.derbyRival && away.derbyRival === home?.slug)
  );
  return { isBigMatch, isDerby };
}
