import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MatchdayGroup from './MatchdayGroup.jsx';
import MatchdaySelector from './MatchdaySelector.jsx';
import FixtureSearch from './FixtureSearch.jsx';
import ScreenshotableCard from './ScreenshotableCard.jsx';
import CopyLinkButton from './CopyLinkButton.jsx';
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

  // '?clean=1' hides sponsor dots/badges on every fixture row (see
  // FixtureRow's `clean` prop) - a page in this state is what a screenshot
  // taken right now, or this exact URL sent to someone else, will show.
  // Toggled on this page's own URL rather than kept as private component
  // state so those two things (the picture and the link) always agree with
  // what's actually on screen.
  const clean = searchParams.get('clean') === '1';

  function toggleClean() {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (clean) params.delete('clean');
        else params.set('clean', '1');
        return params;
      },
      { replace: true }
    );
  }

  function buildCleanLink(matchday) {
    const url = new URL(window.location.href);
    url.searchParams.set('matchday', String(matchday));
    url.searchParams.set('clean', '1');
    return url.toString();
  }

  // A fixture picked from the search box needs its matchday selected (if a
  // single matchday is currently showing) and then to be scrolled to once
  // that matchday's own fixtures are actually in the DOM - which, since
  // setSelected only takes effect on the next render, can't happen in the
  // same tick as the click itself.
  const [highlightFixtureId, setHighlightFixtureId] = useState(null);
  const pendingScrollIdRef = useRef(null);

  function handleSearchSelect(fixture) {
    if (selected !== 'all' && selected !== fixture.matchday) setSelected(fixture.matchday);
    pendingScrollIdRef.current = fixture.id;
    setHighlightFixtureId(fixture.id);
  }

  useEffect(() => {
    if (!pendingScrollIdRef.current) return;
    const el = document.getElementById(`fixture-${pendingScrollIdRef.current}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pendingScrollIdRef.current = null;
    }
  });

  useEffect(() => {
    if (!highlightFixtureId) return undefined;
    const t = setTimeout(() => setHighlightFixtureId(null), 2200);
    return () => clearTimeout(t);
  }, [highlightFixtureId]);

  // A finger-drag on a single visible matchday card steps to the next/
  // previous one, the same move the selector's ‹/› arrows make - tracked as
  // a plain start/end delta (not a live drag-follow) so it never fights the
  // page's own vertical scroll. The View Transitions API (where supported)
  // gives the switch an actual directional slide instead of an instant
  // swap - see the `[data-matchday-swipe]` keyframes in index.css - and
  // falls back to a plain instant change wherever it isn't.
  const touchStartRef = useRef(null);

  function navigateWithSlide(next, direction) {
    document.documentElement.setAttribute('data-matchday-swipe', direction);
    const apply = () => setSelected(next);
    if (document.startViewTransition) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }

  function handleTouchStart(e) {
    if (selected === 'all' || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  }

  function handleTouchEnd(e) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || selected === 'all') return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const elapsed = Date.now() - start.time;
    // A short, mostly-horizontal, reasonably-quick drag reads as a swipe -
    // anything slower/more vertical is a scroll or a tap, not a page-change.
    if (elapsed > 800 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = matchdays.indexOf(selected);
    if (dx < 0 && idx < matchdays.length - 1) navigateWithSlide(matchdays[idx + 1], 'next');
    else if (dx > 0 && idx > 0) navigateWithSlide(matchdays[idx - 1], 'prev');
  }

  if (fixtures.length === 0) {
    return <p className="text-center text-white/40 py-12">No fixtures to show.</p>;
  }

  const visibleMatchdays = selected === 'all' ? matchdays : matchdays.filter((md) => md === selected);

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-30 -mx-6 flex flex-col gap-2 bg-[#0f1e54] px-6 py-2 sm:top-[60px] sm:flex-row sm:items-center">
        <div className="sm:w-72 sm:shrink-0">
          <MatchdaySelector matchdays={matchdays} selected={selected ?? matchdays[0]} onChange={setSelected} />
        </div>
        <FixtureSearch fixtures={fixtures} onSelect={handleSearchSelect} />
        <button
          type="button"
          onClick={toggleClean}
          title="Hide sponsor dots/badges - what a screenshot taken now, or this page's link, will show"
          className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
            clean
              ? 'border-[#1fd8c9] bg-[#1fd8c9] text-[#0f1e54]'
              : 'border-[#1fd8c9] bg-transparent text-[#1fd8c9] hover:bg-[#1fd8c9]/10'
          }`}
        >
          Clean share
        </button>
      </div>
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
        className="flex flex-col gap-4"
      >
        {visibleMatchdays.map((md) => {
          const rotatingTeam = accentTeams?.length > 1 ? accentTeams[(md - 1) % accentTeams.length] : null;
          return (
            <ScreenshotableCard
              key={md}
              filename={`${screenshotPrefix}-md${md}`}
              background="#0f1e54"
              style={selected !== 'all' ? { viewTransitionName: 'matchday-card' } : undefined}
              extra={<CopyLinkButton buildUrl={() => buildCleanLink(md)} />}
            >
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
                highlightFixtureId={highlightFixtureId}
                clean={clean}
              />
            </ScreenshotableCard>
          );
        })}
      </div>
    </div>
  );
}
