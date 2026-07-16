// League table computation - points (3/1/0) plus the tiebreak order from the
// README's "Standing Tiebreakers" section: head-to-head points, head-to-head
// goal difference, overall goal difference, goals scored, then alphabetical.
// The single-legged play-off the README describes for a tie at 1st or the
// last safety spot is a real-world procedure, not something this app can
// simulate - alphabetical is the deterministic fallback used here instead,
// same as for every other tied position.

export function isPlayed(fixture) {
  return (
    fixture.homeScore !== null &&
    fixture.homeScore !== undefined &&
    fixture.awayScore !== null &&
    fixture.awayScore !== undefined
  );
}

function blankStats(team) {
  return { slug: team.slug, team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

function applyResult(stats, goalsFor, goalsAgainst) {
  stats.played += 1;
  stats.goalsFor += goalsFor;
  stats.goalsAgainst += goalsAgainst;
  if (goalsFor > goalsAgainst) {
    stats.won += 1;
    stats.points += 3;
  } else if (goalsFor === goalsAgainst) {
    stats.drawn += 1;
    stats.points += 1;
  } else {
    stats.lost += 1;
  }
}

function playedThrough(fixtures, throughMatchday) {
  return fixtures.filter((f) => f.matchday <= throughMatchday && isPlayed(f));
}

function headToHead(slugA, slugB, played) {
  let ptsA = 0;
  let ptsB = 0;
  let gfA = 0;
  let gfB = 0;
  for (const f of played) {
    const aIsHome = f.home.slug === slugA && f.away.slug === slugB;
    const aIsAway = f.away.slug === slugA && f.home.slug === slugB;
    if (!aIsHome && !aIsAway) continue;
    const [goalsA, goalsB] = aIsHome ? [f.homeScore, f.awayScore] : [f.awayScore, f.homeScore];
    gfA += goalsA;
    gfB += goalsB;
    if (goalsA > goalsB) ptsA += 3;
    else if (goalsA === goalsB) {
      ptsA += 1;
      ptsB += 1;
    } else ptsB += 3;
  }
  return { ptsA, ptsB, gdA: gfA - gfB, gdB: gfB - gfA };
}

function compareStats(a, b, played) {
  if (b.points !== a.points) return b.points - a.points;
  const h2h = headToHead(a.slug, b.slug, played);
  if (h2h.ptsB !== h2h.ptsA) return h2h.ptsB - h2h.ptsA;
  if (h2h.gdB !== h2h.gdA) return h2h.gdB - h2h.gdA;
  const gdA = a.goalsFor - a.goalsAgainst;
  const gdB = b.goalsFor - b.goalsAgainst;
  if (gdB !== gdA) return gdB - gdA;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.team.name.localeCompare(b.team.name);
}

// Ranked table as it stood after `throughMatchday` (default: the whole
// season). Every team appears even with zero games played.
export function computeStandings(fixtures, teams, throughMatchday = Infinity) {
  const statsBySlug = new Map(teams.map((t) => [t.slug, blankStats(t)]));
  const played = playedThrough(fixtures, throughMatchday);
  for (const f of played) {
    const home = statsBySlug.get(f.home.slug);
    const away = statsBySlug.get(f.away.slug);
    if (!home || !away) continue;
    applyResult(home, f.homeScore, f.awayScore);
    applyResult(away, f.awayScore, f.homeScore);
  }
  const list = [...statsBySlug.values()];
  list.sort((a, b) => compareStats(a, b, played));
  return list;
}

// One cumulative-points snapshot per matchday that has at least one fixture,
// in matchday order - the data the "standing by matchday" line chart plots.
export function computeStandingsHistory(fixtures, teams) {
  const matchdays = [...new Set(fixtures.map((f) => f.matchday))].sort((a, b) => a - b);
  const statsBySlug = new Map(teams.map((t) => [t.slug, blankStats(t)]));
  const history = [];
  for (const md of matchdays) {
    for (const f of fixtures) {
      if (f.matchday !== md || !isPlayed(f)) continue;
      const home = statsBySlug.get(f.home.slug);
      const away = statsBySlug.get(f.away.slug);
      if (!home || !away) continue;
      applyResult(home, f.homeScore, f.awayScore);
      applyResult(away, f.awayScore, f.homeScore);
    }
    const points = {};
    for (const [slug, s] of statsBySlug) points[slug] = s.points;
    history.push({ matchday: md, points });
  }
  return history;
}

// One ranked-position snapshot per matchday that has at least one fixture -
// the data the "standing by matchday" position chart plots. Needs the full
// tiebreak sort (unlike computeStandingsHistory's raw points), so it's
// costlier - fine at this fixture count, called once per render.
export function computeRankHistory(fixtures, teams) {
  const matchdays = [...new Set(fixtures.map((f) => f.matchday))].sort((a, b) => a - b);
  return matchdays.map((matchday) => {
    const table = computeStandings(fixtures, teams, matchday);
    const ranks = {};
    table.forEach((row, i) => {
      ranks[row.slug] = i + 1;
    });
    return { matchday, ranks };
  });
}

export function maxPlayedMatchday(fixtures) {
  let max = 0;
  for (const f of fixtures) {
    if (isPlayed(f)) max = Math.max(max, f.matchday);
  }
  return max;
}
