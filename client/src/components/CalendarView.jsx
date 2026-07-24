import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import MatchdayGroup from './MatchdayGroup.jsx';
import MatchdaySelector from './MatchdaySelector.jsx';
import ScreenshotableCard from './ScreenshotableCard.jsx';
import { closestMatchday } from '../lib/matchdays.js';
import { computeMatchTags } from '../lib/matchTags.js';
import { computeSponsorCounts } from '../lib/sponsorCounts.js';

export default function CalendarView({
  fixtures,
  onUpdate,
  onDelete,
  highlightSlugs = [],
  accent = '#1fd8c9',
  // More than one club here (a multi-team branded calendar) rotates each
  // matchday header through that club's own primary/secondary colours
  // instead of every matchday using the same flat `accent` - which,
  // without this, was always just the first selected club's colour,
  // leaving every other selected club's brand invisible from the header.
  accentTeams,
  canEdit = false,
  screenshotPrefix = 'matchday',
}) {
  const byMatchday = new Map();
  for (const f of fixtures) {
    if (!byMatchday.has(f.matchday)) byMatchday.set(f.matchday, []);
    byMatchday.get(f.matchday).push(f);
  }
  for (const group of byMatchday.values()) {
    group.sort((a, b) => {
      const dateCompare = (a.date ?? '9999').localeCompare(b.date ?? '9999');
      if (dateCompare !== 0) return dateCompare;
      return (a.kickoffTime ?? '99:99').localeCompare(b.kickoffTime ?? '99:99');
    });
    // Fixtures sharing a date+kickoff slot air as one DAZN simulcast block;
    // only the first one in the block should collect the shared audience figure.
    let lastKey = null;
    for (const f of group) {
      const key = `${f.date ?? ''}|${f.kickoffTime ?? ''}`;
      f.isFirstInBlock = key !== lastKey;
      lastKey = key;
      Object.assign(f, computeMatchTags(f));
    }
  }
  const matchdays = [...byMatchday.keys()].sort((a, b) => a - b);

  // Caps apply across the whole season, not just the visible matchday(s).
  const sponsorCounts = useMemo(() => computeSponsorCounts(fixtures), [fixtures]);

  // matchdays/byMatchday are recomputed fresh every render from fixtures,
  // so fixtures is the only dependency that should retrigger this memo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultMatchday = useMemo(() => closestMatchday(matchdays, byMatchday), [fixtures]);

  // '?matchday=' persists which matchday (or 'all') is being viewed, so a
  // bookmarked/shared link reopens on the same one instead of always
  // resetting to whichever's closest to today. Only written once the user
  // actually changes it (see setSelected) - a stale/out-of-range value
  // (e.g. left over from a different season) falls back to the default
  // rather than rendering nothing.
  const [searchParams, setSearchParams] = useSearchParams();
  const matchdayParam = searchParams.get('matchday');
  const selected =
    matchdayParam === 'all'
      ? 'all'
      : matchdayParam && matchdays.includes(Number(matchdayParam))
        ? Number(matchdayParam)
        : defaultMatchday;

  function setSelected(next) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === null || next === undefined) params.delete('matchday');
        else params.set('matchday', String(next));
        return params;
      },
      { replace: true }
    );
  }

  if (fixtures.length === 0) {
    return <p className="text-center text-white/40 py-12">No fixtures to show.</p>;
  }

  const visibleMatchdays = selected === 'all' ? matchdays : matchdays.filter((md) => md === selected);

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-30 -mx-6 bg-[#0f1e54] px-6 py-2 sm:top-[60px]">
        <MatchdaySelector matchdays={matchdays} selected={selected ?? matchdays[0]} onChange={setSelected} />
      </div>
      {visibleMatchdays.map((md) => {
        const rotatingTeam = accentTeams?.length > 1 ? accentTeams[(md - 1) % accentTeams.length] : null;
        return (
          <ScreenshotableCard key={md} filename={`${screenshotPrefix}-md${md}`} background="#0f1e54">
            <MatchdayGroup
              matchday={md}
              fixtures={byMatchday.get(md)}
              onUpdate={onUpdate}
              onDelete={onDelete}
              highlightSlugs={highlightSlugs}
              accent={rotatingTeam ? rotatingTeam.primary : accent}
              textColor={rotatingTeam ? rotatingTeam.secondary : undefined}
              canEdit={canEdit}
              sponsorCounts={sponsorCounts}
            />
          </ScreenshotableCard>
        );
      })}
    </div>
  );
}
