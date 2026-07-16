import { isPlayed } from './standings.js';

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
  const allPlayed = fixtures.filter((f) => (f.home.slug === team.slug || f.away.slug === team.slug) && isPlayed(f));
  const allForTeam = fixtures.filter((f) => f.home.slug === team.slug || f.away.slug === team.slug);

  const homeAudiences = homePlayed.map((f) => effectiveAudience(f, simulcastInfo, includeSimulcast));
  const totalAudiences = allPlayed.map((f) => effectiveAudience(f, simulcastInfo, includeSimulcast));
  const homeAddedTime = homePlayed.map(addedTimeMinutes);

  return {
    team,
    homeGamesPlayed: homePlayed.length,
    homeAudienceTotal: sum(homeAudiences),
    homeAudienceAvg: avg(homeAudiences),
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
