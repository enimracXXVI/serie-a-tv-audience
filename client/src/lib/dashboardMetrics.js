import { isPlayed } from './standings.js';
import { computeMatchTags } from './matchTags.js';
import { SPONSOR_TYPES } from './sponsorCounts.js';

function blockKey(fixture) {
  return `${fixture.date ?? ''}|${fixture.kickoffTime ?? ''}`;
}

// Games sharing an exact date+kickoff slot air as one DAZN simulcast block -
// only the first one in the block collects the shared daznSimulcastAudience
// figure (see CalendarView's isFirstInBlock). This finds that figure for
// every fixture in a multi-game block, plus how many games shared it.
export function computeSimulcastInfo(fixtures) {
  const groups = new Map();
  for (const f of fixtures) {
    if (!f.date || !f.kickoffTime) continue;
    const key = blockKey(f);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  const info = new Map();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const withFigure = group.find((f) => f.daznSimulcastAudience !== null && f.daznSimulcastAudience !== undefined);
    const simulcastAudience = withFigure ? Number(withFigure.daznSimulcastAudience) : null;
    for (const f of group) info.set(f.id, { blockSize: group.length, simulcastAudience });
  }
  return info;
}

// Default ("main way to track"): a game's own daznAudience plus Sky's
// audience when also broadcast there - no simulcast blending, since that
// would double-count the same viewers across every game in a shared slot.
// With includeSimulcast on, each game in a shared slot additionally gets an
// even share of that slot's daznSimulcastAudience (divided by block size) -
// the "smart" adjusted view, off by default.
export function effectiveAudience(fixture, simulcastInfo, includeSimulcast) {
  let total = Number(fixture.daznAudience) || 0;
  if (fixture.onSky) total += Number(fixture.skyAudience) || 0;
  if (includeSimulcast) {
    const info = simulcastInfo.get(fixture.id);
    if (info && info.simulcastAudience !== null && info.blockSize > 0) {
      total += info.simulcastAudience / info.blockSize;
    }
  }
  return total;
}

export function addedTimeMinutes(fixture) {
  return (Number(fixture.addedTime1H) || 0) + (Number(fixture.addedTime2H) || 0);
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}
function avg(arr) {
  return arr.length ? sum(arr) / arr.length : 0;
}

// LED-only packages are visible only at the sponsoring club's own stadium,
// so their evaluation metric is home games alone. Jersey/kit partnerships
// are visible in every game the club plays, home or away, so that metric
// uses the full fixture list.
export function computeTeamMetrics(team, fixtures, simulcastInfo, includeSimulcast) {
  const homePlayed = fixtures.filter((f) => f.home.slug === team.slug && isPlayed(f));
  const awayPlayed = fixtures.filter((f) => f.away.slug === team.slug && isPlayed(f));
  const allPlayed = fixtures.filter((f) => (f.home.slug === team.slug || f.away.slug === team.slug) && isPlayed(f));
  const allForTeam = fixtures.filter((f) => f.home.slug === team.slug || f.away.slug === team.slug);

  const homeAudiences = homePlayed.map((f) => effectiveAudience(f, simulcastInfo, includeSimulcast));
  // Not "how big an audience this club draws at home" (that's homeAudienceAvg) -
  // this is the reverse: how big an audience shows up FOR THE HOME SIDE'S
  // broadcast simply because this club is the visitor, averaged across every
  // away ground they've played at. A proxy for a club's draw power as a guest.
  const awayAudiences = awayPlayed.map((f) => effectiveAudience(f, simulcastInfo, includeSimulcast));
  const totalAudiences = allPlayed.map((f) => effectiveAudience(f, simulcastInfo, includeSimulcast));
  const homeAddedTime = homePlayed.map(addedTimeMinutes);

  return {
    team,
    homeGamesPlayed: homePlayed.length,
    homeAudienceTotal: sum(homeAudiences),
    homeAudienceAvg: avg(homeAudiences),
    awayGamesPlayed: awayPlayed.length,
    awayAudienceTotal: sum(awayAudiences),
    awayAudienceAvg: avg(awayAudiences),
    totalGamesPlayed: allPlayed.length,
    totalAudienceTotal: sum(totalAudiences),
    totalAudienceAvg: avg(totalAudiences),
    homeAddedTimeTotal: sum(homeAddedTime),
    homeAddedTimeAvg: avg(homeAddedTime),
    simulcastCount: allForTeam.filter((f) => simulcastInfo.has(f.id)).length,
    skyCount: allForTeam.filter((f) => f.onSky).length,
  };
}

export function computeAllTeamMetrics(teams, fixtures, includeSimulcast) {
  const simulcastInfo = computeSimulcastInfo(fixtures);
  return teams.map((team) => computeTeamMetrics(team, fixtures, simulcastInfo, includeSimulcast));
}

export function computeTopGames(fixtures, simulcastInfo, includeSimulcast, { teamSlug, homeOnly, limit = 10 } = {}) {
  let list = fixtures.filter(isPlayed);
  if (teamSlug) {
    list = homeOnly
      ? list.filter((f) => f.home.slug === teamSlug)
      : list.filter((f) => f.home.slug === teamSlug || f.away.slug === teamSlug);
  }
  return list
    .map((f) => ({ fixture: f, audience: effectiveAudience(f, simulcastInfo, includeSimulcast) }))
    .sort((a, b) => b.audience - a.audience)
    .slice(0, limit);
}

function filterForTeam(fixtures, teamSlug) {
  if (!teamSlug) return fixtures;
  return fixtures.filter((f) => f.home.slug === teamSlug || f.away.slug === teamSlug);
}

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Kickoff scheduling (day of week, kickoff time) is a broadcaster decision,
// not a club one, so these are league-wide (optionally narrowed to one
// club's own games) rather than per-team like the home/total split above.
export function computeAudienceByDay(fixtures, simulcastInfo, includeSimulcast, teamSlug) {
  const played = filterForTeam(fixtures, teamSlug).filter((f) => isPlayed(f) && f.day);
  const byDay = new Map();
  for (const f of played) {
    const aud = effectiveAudience(f, simulcastInfo, includeSimulcast);
    if (!byDay.has(f.day)) byDay.set(f.day, []);
    byDay.get(f.day).push(aud);
  }
  return DAY_ORDER.filter((d) => byDay.has(d)).map((d) => {
    const list = byDay.get(d);
    return { key: d, label: d, avg: avg(list), total: sum(list), count: list.length };
  });
}

export function computeAudienceByKickoff(fixtures, simulcastInfo, includeSimulcast, teamSlug) {
  const played = filterForTeam(fixtures, teamSlug).filter((f) => isPlayed(f) && f.kickoffTime);
  const byTime = new Map();
  for (const f of played) {
    const aud = effectiveAudience(f, simulcastInfo, includeSimulcast);
    if (!byTime.has(f.kickoffTime)) byTime.set(f.kickoffTime, []);
    byTime.get(f.kickoffTime).push(aud);
  }
  return [...byTime.entries()]
    .map(([time, list]) => ({ key: time, label: time, avg: avg(list), total: sum(list), count: list.length }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function computeAudienceByDayAndTime(fixtures, simulcastInfo, includeSimulcast, teamSlug) {
  const played = filterForTeam(fixtures, teamSlug).filter((f) => isPlayed(f) && f.day && f.kickoffTime);
  const byKey = new Map();
  for (const f of played) {
    const aud = effectiveAudience(f, simulcastInfo, includeSimulcast);
    const key = `${f.day}|${f.kickoffTime}`;
    if (!byKey.has(key)) byKey.set(key, { day: f.day, time: f.kickoffTime, list: [] });
    byKey.get(key).list.push(aud);
  }
  return [...byKey.values()].map(({ day, time, list }) => ({
    day,
    time,
    avg: avg(list),
    total: sum(list),
    count: list.length,
  }));
}

// How much of a visibility premium big matches and derbies carry over an
// ordinary game - useful context when a package's value depends on which
// fixtures it happens to cover.
export function computeTagPremium(fixtures, simulcastInfo, includeSimulcast, teamSlug) {
  const played = filterForTeam(fixtures, teamSlug).filter(isPlayed);
  const buckets = { regular: [], bigMatch: [], derby: [] };
  for (const f of played) {
    const aud = effectiveAudience(f, simulcastInfo, includeSimulcast);
    const { isBigMatch, isDerby } = computeMatchTags(f);
    if (isBigMatch) buckets.bigMatch.push(aud);
    if (isDerby) buckets.derby.push(aud);
    if (!isBigMatch && !isDerby) buckets.regular.push(aud);
  }
  return {
    regular: { avg: avg(buckets.regular), count: buckets.regular.length },
    bigMatch: { avg: avg(buckets.bigMatch), count: buckets.bigMatch.length },
    derby: { avg: avg(buckets.derby), count: buckets.derby.length },
  };
}

// League-wide average audience per matchday across the season, plus one
// club's own game each matchday if focused - shows whether audience is
// rising or falling as the season progresses, and how a club's own games
// track against the league baseline.
export function computeSeasonTrend(fixtures, simulcastInfo, includeSimulcast, teamSlug) {
  const matchdays = [...new Set(fixtures.map((f) => f.matchday))].sort((a, b) => a - b);
  return matchdays.map((matchday) => {
    const played = fixtures.filter((f) => f.matchday === matchday && isPlayed(f));
    const leagueAvg = avg(played.map((f) => effectiveAudience(f, simulcastInfo, includeSimulcast)));
    let teamValue = null;
    if (teamSlug) {
      const game = played.find((f) => f.home.slug === teamSlug || f.away.slug === teamSlug);
      teamValue = game ? effectiveAudience(game, simulcastInfo, includeSimulcast) : null;
    }
    return { matchday, leagueAvg, teamValue };
  });
}

// What's left to sell/evaluate, not just what's happened so far - a
// sponsorship decision made mid-season cares about the remaining fixture
// list, not only the season-to-date average. Home-only when a club is
// focused (the LED angle: what's still coming to their own stadium);
// league-wide across every remaining fixture otherwise.
export function computeRemainingSchedule(fixtures, teamSlug) {
  let remaining = fixtures.filter((f) => !isPlayed(f));
  if (teamSlug) remaining = remaining.filter((f) => f.home.slug === teamSlug);
  let bigMatch = 0;
  let derby = 0;
  let regular = 0;
  for (const f of remaining) {
    const { isBigMatch, isDerby } = computeMatchTags(f);
    if (isBigMatch) bigMatch += 1;
    if (isDerby) derby += 1;
    if (!isBigMatch && !isDerby) regular += 1;
  }
  return { total: remaining.length, bigMatch, derby, regular };
}

// Which visiting opponent actually brings the audience at a club's own
// stadium - an average hides this entirely, but it's exactly what an LED
// package buyer cares about (a Torino-Juventus crowd is not a Torino-Lecce
// crowd), plus the min-max range across all of that club's home games as a
// sense of how much game-to-game variance sits behind the average.
export function computeOpponentAudience(team, fixtures, simulcastInfo, includeSimulcast) {
  const homePlayed = fixtures.filter((f) => f.home.slug === team.slug && isPlayed(f));
  const byOpponent = new Map();
  const all = [];
  for (const f of homePlayed) {
    const aud = effectiveAudience(f, simulcastInfo, includeSimulcast);
    all.push(aud);
    if (!byOpponent.has(f.away.slug)) byOpponent.set(f.away.slug, { opponent: f.away, list: [] });
    byOpponent.get(f.away.slug).list.push(aud);
  }
  const rows = [...byOpponent.values()]
    .map(({ opponent, list }) => ({ opponent, avg: avg(list), count: list.length }))
    .sort((a, b) => b.avg - a.avg);
  const range = all.length
    ? { min: Math.min(...all), max: Math.max(...all), avg: avg(all), count: all.length }
    : { min: 0, max: 0, avg: 0, count: 0 };
  return { rows, range };
}

// Ties the Sponsors tab's per-fixture activation checkboxes directly to the
// audience they actually reached - "what did checking that box deliver?"
// rather than just how many times it was checked.
export function computeActivationAudience(team, fixtures, simulcastInfo, includeSimulcast) {
  const forTeam = fixtures.filter((f) => f.home.slug === team.slug || f.away.slug === team.slug);
  return SPONSOR_TYPES.map(({ fixtureKey, label }) => {
    const audiences = [];
    for (const f of forTeam) {
      if (!isPlayed(f)) continue;
      const side = f.home.slug === team.slug ? 'home' : 'away';
      if (f[`${side}${fixtureKey}`]) audiences.push(effectiveAudience(f, simulcastInfo, includeSimulcast));
    }
    return { key: fixtureKey, label, count: audiences.length, total: sum(audiences), avg: avg(audiences) };
  });
}
