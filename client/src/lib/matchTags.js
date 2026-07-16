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

// A fixture can be both at once (e.g. two big clubs who are also each
// other's derby rival) - both labels should show, and the combination
// should look more emphatic than either alone, not just pick one.
export function matchTagStyle({ isDerby, isBigMatch }) {
  const labels = [];
  if (isDerby) labels.push({ text: 'DERBY', className: 'text-red-600' });
  if (isBigMatch) labels.push({ text: 'BIG', className: 'text-amber-600' });

  if (isDerby && isBigMatch) {
    return {
      bar: 'linear-gradient(180deg, #ef4444, #f59e0b)',
      background: 'linear-gradient(90deg, #fee2e2, #fef3c7)',
      labels,
    };
  }
  if (isDerby) {
    return { bar: '#ef4444', background: '#fef2f2', labels };
  }
  if (isBigMatch) {
    return { bar: '#f59e0b', background: '#fffbeb', labels };
  }
  return { bar: 'transparent', background: undefined, labels };
}
