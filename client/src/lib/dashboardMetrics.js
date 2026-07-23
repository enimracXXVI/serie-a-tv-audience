import { isPlayed } from './standings.js';
import { computeMatchTags } from './matchTags.js';
import { SPONSOR_TYPES } from './sponsorCounts.js';
import { hasLedDeal, hasLedMinutesConcept, ledMinutesApplyToFixture } from './teams.js';

function blockKey(fixture) {
  return `${fixture.date ?? ''}|${fixture.kickoffTime ?? ''}`;
}

// Games sharing an exact date+kickoff slot air as one simulcast block - only
// the first one in the block collects the shared simulcastAudience figure
// (see CalendarView's isFirstInBlock). This finds that figure for every
// fixture in a multi-game block, plus how many games shared it.
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
    const withFigure = group.find((f) => f.simulcastAudience !== null && f.simulcastAudience !== undefined);
    const simulcastAudience = withFigure ? Number(withFigure.simulcastAudience) : null;
    for (const f of group) info.set(f.id, { blockSize: group.length, simulcastAudience });
  }
  return info;
}

// Default ("main way to track"): a game's own main-broadcaster audience plus
// the other broadcaster's figure when this game is also shown elsewhere - no
// simulcast blending, since that would double-count the same viewers across
// every game in a shared slot. With includeSimulcast on, each game in a
// shared slot additionally gets an even share of that slot's simulcast
// figure (divided by block size) - the "smart" adjusted view, off by default.
export function effectiveAudience(fixture, simulcastInfo, includeSimulcast, includeOther = true) {
  let total = Number(fixture.mainAudience) || 0;
  if (includeOther && fixture.otherBroadcaster) total += Number(fixture.otherAudience) || 0;
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
export function computeTeamMetrics(team, fixtures, simulcastInfo, includeSimulcast, includeOther = true) {
  const homePlayed = fixtures.filter((f) => f.home.slug === team.slug && isPlayed(f));
  const awayPlayed = fixtures.filter((f) => f.away.slug === team.slug && isPlayed(f));
  const allPlayed = fixtures.filter((f) => (f.home.slug === team.slug || f.away.slug === team.slug) && isPlayed(f));
  const allForTeam = fixtures.filter((f) => f.home.slug === team.slug || f.away.slug === team.slug);

  const homeAudiences = homePlayed.map((f) => effectiveAudience(f, simulcastInfo, includeSimulcast, includeOther));
  // Not "how big an audience this club draws at home" (that's homeAudienceAvg) -
  // this is the reverse: how big an audience shows up FOR THE HOME SIDE'S
  // broadcast simply because this club is the visitor, averaged across every
  // away ground they've played at. A proxy for a club's draw power as a guest.
  const awayAudiences = awayPlayed.map((f) => effectiveAudience(f, simulcastInfo, includeSimulcast, includeOther));
  const totalAudiences = allPlayed.map((f) => effectiveAudience(f, simulcastInfo, includeSimulcast, includeOther));
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
    otherBroadcasterCount: allForTeam.filter((f) => f.otherBroadcaster).length,
  };
}

export function computeAllTeamMetrics(teams, fixtures, includeSimulcast, includeOther = true) {
  const simulcastInfo = computeSimulcastInfo(fixtures);
  return teams.map((team) => computeTeamMetrics(team, fixtures, simulcastInfo, includeSimulcast, includeOther));
}

export function computeTopGames(
  fixtures,
  simulcastInfo,
  includeSimulcast,
  includeOther = true,
  { teamSlug, homeOnly, limit = 10 } = {}
) {
  let list = fixtures.filter(isPlayed);
  if (teamSlug) {
    list = homeOnly
      ? list.filter((f) => f.home.slug === teamSlug)
      : list.filter((f) => f.home.slug === teamSlug || f.away.slug === teamSlug);
  }
  return list
    .map((f) => ({ fixture: f, audience: effectiveAudience(f, simulcastInfo, includeSimulcast, includeOther) }))
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
export function computeAudienceByDay(fixtures, simulcastInfo, includeSimulcast, includeOther, teamSlug) {
  const played = filterForTeam(fixtures, teamSlug).filter((f) => isPlayed(f) && f.day);
  const byDay = new Map();
  for (const f of played) {
    const aud = effectiveAudience(f, simulcastInfo, includeSimulcast, includeOther);
    if (!byDay.has(f.day)) byDay.set(f.day, []);
    byDay.get(f.day).push(aud);
  }
  return DAY_ORDER.filter((d) => byDay.has(d)).map((d) => {
    const list = byDay.get(d);
    return { key: d, label: d, avg: avg(list), total: sum(list), count: list.length };
  });
}

export function computeAudienceByKickoff(fixtures, simulcastInfo, includeSimulcast, includeOther, teamSlug) {
  const played = filterForTeam(fixtures, teamSlug).filter((f) => isPlayed(f) && f.kickoffTime);
  const byTime = new Map();
  for (const f of played) {
    const aud = effectiveAudience(f, simulcastInfo, includeSimulcast, includeOther);
    const time = f.kickoffTime;
    if (!byTime.has(time)) byTime.set(time, []);
    byTime.get(time).push(aud);
  }
  return [...byTime.entries()]
    .map(([time, list]) => ({ key: time, label: time, avg: avg(list), total: sum(list), count: list.length }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function computeAudienceByDayAndTime(fixtures, simulcastInfo, includeSimulcast, includeOther, teamSlug) {
  const played = filterForTeam(fixtures, teamSlug).filter((f) => isPlayed(f) && f.day && f.kickoffTime);
  const byKey = new Map();
  for (const f of played) {
    const aud = effectiveAudience(f, simulcastInfo, includeSimulcast, includeOther);
    const time = f.kickoffTime;
    const key = `${f.day}|${time}`;
    if (!byKey.has(key)) byKey.set(key, { day: f.day, time, games: [] });
    byKey.get(key).games.push({ fixture: f, audience: aud });
  }
  // `games` (the actual fixtures behind this cell/row) rides alongside the
  // aggregate numbers - lets the heatmap/breakdown table open a modal
  // showing exactly which games make up a given average, on click/tap.
  return [...byKey.values()].map(({ day, time, games }) => {
    const list = games.map((g) => g.audience);
    return { day, time, avg: avg(list), total: sum(list), count: list.length, games };
  });
}

// How much of a visibility premium big matches and derbies carry over an
// ordinary game - useful context when a package's value depends on which
// fixtures it happens to cover.
export function computeTagPremium(fixtures, simulcastInfo, includeSimulcast, includeOther, teamSlug) {
  const played = filterForTeam(fixtures, teamSlug).filter(isPlayed);
  const buckets = { regular: [], bigMatch: [], derby: [] };
  for (const f of played) {
    const aud = effectiveAudience(f, simulcastInfo, includeSimulcast, includeOther);
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
export function computeSeasonTrend(fixtures, simulcastInfo, includeSimulcast, includeOther, teamSlug) {
  const matchdays = [...new Set(fixtures.map((f) => f.matchday))].sort((a, b) => a - b);
  return matchdays
    .map((matchday) => {
      const played = fixtures.filter((f) => f.matchday === matchday && isPlayed(f));
      if (played.length === 0) return null; // nothing played yet this matchday - not a real zero
      const leagueAvg = avg(played.map((f) => effectiveAudience(f, simulcastInfo, includeSimulcast, includeOther)));
      let teamValue = null;
      if (teamSlug) {
        const game = played.find((f) => f.home.slug === teamSlug || f.away.slug === teamSlug);
        teamValue = game ? effectiveAudience(game, simulcastInfo, includeSimulcast, includeOther) : null;
      }
      return { matchday, leagueAvg, teamValue };
    })
    .filter(Boolean);
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
export function computeOpponentAudience(team, fixtures, simulcastInfo, includeSimulcast, includeOther = true) {
  const homePlayed = fixtures.filter((f) => f.home.slug === team.slug && isPlayed(f));
  const byOpponent = new Map();
  const all = [];
  for (const f of homePlayed) {
    const aud = effectiveAudience(f, simulcastInfo, includeSimulcast, includeOther);
    all.push(aud);
    if (!byOpponent.has(f.away.slug)) byOpponent.set(f.away.slug, { opponent: f.away, games: [] });
    byOpponent.get(f.away.slug).games.push({ fixture: f, audience: aud });
  }
  // `games` rides alongside the aggregate so a row can open a modal showing
  // exactly when each of these games was played and whether it shared its
  // kickoff slot with anything else - both directly affect that game's own
  // audience, which a bare average/count hides.
  const rows = [...byOpponent.values()]
    .map(({ opponent, games }) => ({ opponent, avg: avg(games.map((g) => g.audience)), count: games.length, games }))
    .sort((a, b) => b.avg - a.avg);
  const range = all.length
    ? { min: Math.min(...all), max: Math.max(...all), avg: avg(all), count: all.length }
    : { min: 0, max: 0, avg: 0, count: 0 };
  return { rows, range };
}

// Ties the Sponsors tab's per-fixture activation checkboxes directly to the
// audience they actually reached - "what did checking that box deliver?"
// rather than just how many times it was checked.
export function computeActivationAudience(team, fixtures, simulcastInfo, includeSimulcast, includeOther = true) {
  const forTeam = fixtures.filter((f) => f.home.slug === team.slug || f.away.slug === team.slug);
  return SPONSOR_TYPES.map(({ fixtureKey, label }) => {
    const audiences = [];
    for (const f of forTeam) {
      if (!isPlayed(f)) continue;
      const side = f.home.slug === team.slug ? 'home' : 'away';
      if (f[`${side}${fixtureKey}`]) audiences.push(effectiveAudience(f, simulcastInfo, includeSimulcast, includeOther));
    }
    return { key: fixtureKey, label, count: audiences.length, total: sum(audiences), avg: avg(audiences) };
  });
}

// LED perimeter-board minutes and that game's audience, reported side by
// side rather than multiplied together - minutes measure how long the
// board ran, audience measures how many people watched the match at all;
// neither scales the other; a viewer watching a board for 10 minutes
// isn't "more aware" of the brand than one watching it for 5. Scoped to
// this club's own home games only, same as everywhere else LED is
// tracked - the boards only exist at their own stadium.
export function computeLedExposure(team, fixtures, simulcastInfo, includeSimulcast, includeOther = true) {
  if (!hasLedDeal(team)) return null;
  const homeGames = fixtures.filter((f) => f.home.slug === team.slug && isPlayed(f));

  // A club whose only signage deal is the goal carpet has no per-fixture
  // minutes concept at all (see hasLedMinutesConcept) - reach (audience) is
  // still real and worth reporting, but fabricating a "0 min" LED number for
  // every game would misrepresent a completely different sponsorship
  // element as an inactive LED deal.
  if (!hasLedMinutesConcept(team)) {
    const audiences = homeGames.map((fixture) => effectiveAudience(fixture, simulcastInfo, includeSimulcast, includeOther));
    return {
      goalCarpetOnly: true,
      games: homeGames.map((fixture, i) => ({ fixture, audience: audiences[i] })),
      count: homeGames.length,
      totalAudience: sum(audiences),
      avgAudience: avg(audiences),
    };
  }

  // A deal signed partway through the season (ledStartMatchday) only
  // applies to fixtures from that matchday on - earlier home games never
  // had the board there at all, so they're excluded rather than counted
  // with 0 minutes.
  const eligibleGames = homeGames.filter((fixture) => ledMinutesApplyToFixture(team, fixture));
  const games = eligibleGames.map((fixture) => {
    const base = Number(team.ledMinutes) || 0;
    const extra = Number(fixture.extraLedMinutes) || 0;
    const addedTime = team.addedTimeLed ? addedTimeMinutes(fixture) : 0;
    const minutes = base + extra + addedTime;
    const audience = effectiveAudience(fixture, simulcastInfo, includeSimulcast, includeOther);
    const penaltyExposure = Boolean(team.penaltyLed && fixture.penaltyTaken);
    return { fixture, audience, minutes, base, extra, addedTime, penaltyExposure };
  });
  return {
    goalCarpetOnly: false,
    games,
    count: games.length,
    totalMinutes: sum(games.map((g) => g.minutes)),
    avgMinutes: avg(games.map((g) => g.minutes)),
    totalAudience: sum(games.map((g) => g.audience)),
    avgAudience: avg(games.map((g) => g.audience)),
    penaltyGames: games.filter((g) => g.penaltyExposure).length,
  };
}
