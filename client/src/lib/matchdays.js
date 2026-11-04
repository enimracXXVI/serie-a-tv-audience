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
