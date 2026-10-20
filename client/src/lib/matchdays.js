// Picks whichever matchday's fixtures are closest (by date) to today - used
// to default the matchday selector without requiring the user to know which
// round the season is currently on.
export function closestMatchday(matchdays, byMatchday) {
  if (matchdays.length === 0) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let best = matchdays[0];
  let bestDiff = Infinity;
  for (const md of matchdays) {
    const dated = byMatchday.get(md).find((f) => f.date);
    if (!dated) continue;
    const diff = Math.abs(new Date(`${dated.date}T00:00:00`) - today);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = md;
    }
  }
  return best;
}

// Same idea as closestMatchday, but restricted to matchdays that still have
// at least one fixture dated today or later - a round whose games have
// already kicked off is never a useful default for something like
// Hospitality, which can't issue tickets for a game that's already
// happened, even if that round's date happens to be nearer to today than
// the next one still to come (e.g. today is a Monday right after Sunday's
// late kickoffs, with next weekend's round still over a week out).
//
// Deliberately goes by DATE, not by whether a score has been entered yet -
// this app's results are typed in by hand and can lag a game's real kickoff
// by hours or days, so treating "no score yet" as "hasn't been played yet"
// would keep defaulting back to a round that already happened the moment
// its scores are slow to be logged. A fixture with no date at all (not yet
// scheduled) is treated as still pending - there's nothing saying it's in
// the past. Falls back to the plain closest-by-date pick if every matchday
// given is already in the past (the whole competition's fixtures are done,
// nothing left to default to).
export function nextUpcomingMatchday(matchdays, byMatchday) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pending = matchdays.filter((md) =>
    byMatchday.get(md).some((f) => !f.date || new Date(`${f.date}T00:00:00`) >= today)
  );
  return pending.length > 0 ? closestMatchday(pending, byMatchday) : closestMatchday(matchdays, byMatchday);
}

// The sheet's `day` column is a plain weekday abbreviation set once when a
// fixture's date was first entered - it doesn't update itself if the date is
// edited later, so every date write recomputes it from the new date instead
// of trusting whatever was there before.
export function computeDayOfWeek(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}
