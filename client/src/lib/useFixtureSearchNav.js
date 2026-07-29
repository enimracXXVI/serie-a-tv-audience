import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Shared by any page pairing a <FixtureSearch> (rendered in the page's own
// nav row, alongside "Build calendar" and friends) with a <CalendarView>
// (rendered separately, lower on the page) - picking a search result needs
// to both jump CalendarView to that fixture's matchday (a URL param
// CalendarView itself already owns/validates - writing a raw value here is
// fine, it clamps/falls back the same way a stale value from anywhere else
// would) and scroll+highlight the row once it's actually in the DOM, which
// can only happen once CalendarView re-renders with the new matchday.
export function useFixtureSearchNav() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightFixtureId, setHighlightFixtureId] = useState(null);
  const pendingScrollIdRef = useRef(null);

  function handleSearchSelect(fixture) {
    if (searchParams.get('matchday') !== 'all') {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set('matchday', String(fixture.matchday));
          return params;
        },
        { replace: true }
      );
    }
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

  return { highlightFixtureId, handleSearchSelect };
}
