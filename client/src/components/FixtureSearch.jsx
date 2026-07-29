import { useEffect, useMemo, useRef, useState } from 'react';
import Crest from './Crest.jsx';
import { searchFixtures } from '../lib/searchFixtures.js';

const PAGE_SIZE = 10;

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// A single free-text box for jumping straight to a fixture instead of
// stepping through the matchday selector one at a time - matches team
// name(s), a matchday number, or a date (see lib/searchFixtures.js for the
// matching rules), then hands the picked fixture back to the caller to
// select its matchday and scroll it into view.
export default function FixtureSearch({ fixtures, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const ref = useRef(null);
  const listRef = useRef(null);

  const allResults = useMemo(() => searchFixtures(fixtures, query), [fixtures, query]);
  const results = allResults.slice(0, visibleCount);
  const hasMore = allResults.length > results.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // The results list scrolls internally once it has more rows than fit
  // (see the container's max-h/overflow-y below) - `overscroll-behavior`
  // alone stops that internal scroll from chaining into the page's own
  // scroll once it hits the top/bottom, but only once the list actually
  // needs to scroll. With few results (nothing to scroll) the browser
  // treats the box as non-scrolling and a wheel/swipe over it falls
  // straight through to the page instead - these two listeners are only
  // there to swallow that specific case, added as real (non-passive) DOM
  // listeners since React's synthetic wheel/touch handlers are passive and
  // can't preventDefault.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    function swallowIfNotScrollable(e) {
      if (el.scrollHeight <= el.clientHeight) e.preventDefault();
    }
    el.addEventListener('wheel', swallowIfNotScrollable, { passive: false });
    el.addEventListener('touchmove', swallowIfNotScrollable, { passive: false });
    return () => {
      el.removeEventListener('wheel', swallowIfNotScrollable);
      el.removeEventListener('touchmove', swallowIfNotScrollable);
    };
  }, [open, results.length]);

  function handlePick(fixture) {
    onSelect(fixture);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <div className="flex items-center gap-1.5 rounded-full border-2 border-[#1fd8c9] bg-transparent px-3 py-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[#1fd8c9]">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            else if (e.key === 'Enter' && results[0]) handlePick(results[0]);
          }}
          placeholder="Search team, matchday or date…"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#1fd8c9] placeholder:text-[#1fd8c9]/50 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
            aria-label="Clear search"
            className="shrink-0 text-[#1fd8c9]/70 hover:text-[#1fd8c9]"
          >
            ✕
          </button>
        )}
      </div>

      {open && query && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 z-40 mt-1 max-h-80 overflow-y-auto overscroll-contain rounded-lg bg-[#0f1e54] py-1 shadow-xl ring-1 ring-white/10"
        >
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-white/40">No fixtures match &quot;{query}&quot;.</p>
          ) : (
            <>
              {results.map((f) => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => handlePick(f)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-white/10"
                >
                  <span className="w-14 shrink-0 text-[10px] font-bold uppercase tracking-wide text-white/40">
                    MD{f.matchday}
                  </span>
                  <Crest team={f.home} size={16} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                    <span className="sm:hidden">{f.home.short ?? f.home.name} - {f.away.short ?? f.away.name}</span>
                    <span className="hidden sm:inline">{f.home.name} - {f.away.name}</span>
                  </span>
                  <Crest team={f.away} size={16} />
                  <span className="w-14 shrink-0 text-right text-[10px] text-white/40">{formatDateShort(f.date)}</span>
                </button>
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                  className="block w-full px-3 py-1.5 text-center text-xs font-bold text-[#1fd8c9] hover:bg-white/10"
                >
                  Show {Math.min(PAGE_SIZE, allResults.length - results.length)} more…
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
