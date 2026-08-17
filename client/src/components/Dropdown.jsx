import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Typing a letter on a native <select> jumps straight to the first option
// starting with it - this custom listbox is real buttons in a div, so it
// gets none of that for free. Buffers consecutive keystrokes (a short pause
// resets it) and re-runs the prefix match each time, so typing "ju" narrows
// past every other J-team straight to Juventus, same feel as the native
// control despite not being one. Works whether the list is open or closed,
// since the trigger button stays focused either way.
const TYPEAHEAD_RESET_MS = 600;

// Native <select> can't have its open options list restyled reliably
// across browsers/devices (Android Chrome in particular renders its own
// dark, barely-themed popup no CSS here reaches) - this is a fully custom
// listbox instead, so both the closed pill and the open list are entirely
// our own markup. Two closed-state looks: 'header' (cyan border/text, for
// the sticky page headers) and 'sidebar' (white border/text, for the
// hamburger menu's Settings panels) - the open list itself is always the
// same navy-blue-with-white-text menu regardless of variant.
const CLOSED_VARIANTS = {
  header: 'rounded-full border-[#1fd8c9] bg-transparent text-[#1fd8c9]',
  sidebar: 'rounded-full border-white/40 bg-transparent text-white',
  // For use inside a white card/edit-panel context (fixture edit tabs, add-
  // fixture forms) - a filled, squared-off field rather than the navy pages'
  // outlined pill, so it reads as one of that form's own inputs instead of a
  // page-chrome control that happens to sit on a white background.
  light: 'rounded-lg border-gray-200 bg-gray-50 text-[#0f1e54]',
  // For use inside a Card's own teal header (AudienceBarChart, TopGamesList) -
  // the 'header' variant's teal border/text is meant to contrast against the
  // navy page header and reads as invisible teal-on-teal here instead, so this
  // variant uses navy instead, matching ToggleSwitch's onColor treatment for
  // the same context.
  tealHeader: 'rounded-full border-[#0f1e54]/50 bg-white/25 text-[#0f1e54]',
};

export default function Dropdown({ value, onChange, options, variant = 'sidebar', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);
  // The open list is portaled to <body> (see the render below) so a fixture
  // row sitting inside a short `overflow-hidden` round/matchday card can't
  // clip it off at the card's own bottom edge with no way to scroll the rest
  // into view - it used to live right there in the DOM and inherited
  // whatever ancestor happened to clip. Position is computed in viewport
  // coordinates and kept in sync with `position: fixed`, same idea as the
  // old in-place `absolute` version just anchored to the viewport instead of
  // a parent box. Left-aligned to the trigger's own left edge (not centered
  // under it) so the open list reads as belonging to the field it opened
  // from instead of floating off to one side of it; only shifted if that
  // would run the list past the right edge of the viewport.
  const [listPos, setListPos] = useState(null);

  useLayoutEffect(() => {
    if (!open || !ref.current || !listRef.current) {
      setListPos(null);
      return;
    }
    const margin = 8;
    const triggerRect = ref.current.getBoundingClientRect();
    const listWidth = listRef.current.offsetWidth;
    const left = Math.min(Math.max(triggerRect.left, margin), window.innerWidth - listWidth - margin);
    setListPos({ top: triggerRect.bottom + 4, left, minWidth: triggerRect.width });
  }, [open, options]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    // The list no longer scrolls along with its trigger (it's fixed-
    // positioned, outside the trigger's own scroll container) - closing on
    // any *other* scroll is simpler and safer than trying to keep a
    // portaled popup glued to a trigger that might be moving under it. The
    // list's own internal scroll fires a real capturing 'scroll' event too,
    // seen here before it ever reaches the list itself, so it's excluded -
    // see the wheel listener below for stopping that scroll from chaining
    // into the page (and re-triggering this) in the first place.
    function handleScroll(e) {
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  // `overscroll-contain` (see the list's className below) stops the list's
  // own scroll from chaining into the page once it hits the list's top/
  // bottom - but only once the list actually has somewhere to scroll. With
  // few options (nothing to scroll at all) the browser treats the whole
  // gesture as page scroll instead, which the listener above (correctly)
  // reads as "the page moved out from under this" and closes the list on
  // the very first wheel tick. Swallowing wheel/touch here when there's
  // nothing to scroll (real, non-passive listeners - React's synthetic ones
  // can't preventDefault) covers exactly that gap; overscroll-contain
  // handles the "reached the end, still scrolling" case on its own.
  useEffect(() => {
    if (!open) return undefined;
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
  }, [open]);

  const selected = options.find((o) => !o.divider && o.value === value);

  const typeahead = useRef({ query: '', timeoutId: null });

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    // Space/Enter are left to the button's own default (toggles open), and
    // anything with a modifier or longer than one char (arrows, Tab, ...)
    // isn't a character to search on.
    if (e.key === ' ' || e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
    clearTimeout(typeahead.current.timeoutId);
    typeahead.current.query += e.key.toLowerCase();
    const query = typeahead.current.query;
    const match = options.find((o) => !o.divider && o.label.toLowerCase().startsWith(query));
    if (match) onChange(match.value);
    typeahead.current.timeoutId = setTimeout(() => {
      typeahead.current.query = '';
    }, TYPEAHEAD_RESET_MS);
  }

  return (
    <div ref={ref} className={`relative inline-block min-w-0 ${className}`}>
      {/* Fixed h-9 (not padding-derived) so this sits at the exact same
          height as a text/number/date input next to it in the same field
          row - relying on py-* alone drifted a few px off a native date/
          time input's own browser-controlled height, throwing every label
          above it out of alignment. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className={`flex h-9 w-full items-center justify-between gap-1.5 border px-3 text-sm font-bold ${CLOSED_VARIANTS[variant]}`}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {selected?.icon}
          <span className="truncate">{selected?.label ?? ''}</span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-xs">
          ▾
        </span>
      </button>
      {open &&
        createPortal(
          // Capped to the viewport width with labels allowed to wrap instead
          // of forcing one long unbroken line - a long option (e.g. "Away
          // audience (avg/game) - visitor draw power") on a trigger sitting
          // anywhere but the far left of a phone screen used to run straight
          // off the right edge of the viewport with no way to read the rest.
          <div
            ref={listRef}
            className="fixed z-50 max-h-[70vh] w-max max-w-[min(20rem,90vw)] overflow-y-auto overscroll-contain rounded-md bg-[#0f1e54] py-1 shadow-xl ring-1 ring-white/10"
            style={{
              top: listPos?.top ?? 0,
              left: listPos?.left ?? 0,
              minWidth: listPos ? `${listPos.minWidth}px` : undefined,
              visibility: listPos ? 'visible' : 'hidden',
            }}
          >
            {options.map((o) =>
              // A non-selectable section heading (e.g. "Serie A" vs "Other
              // clubs" in a long club picker) - the one thing a native
              // <select>'s <optgroup> gave for free that this custom listbox
              // needs to support explicitly.
              o.divider ? (
                <div
                  key={`divider-${o.label}`}
                  className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-white/40 first:pt-1"
                >
                  {o.label}
                </div>
              ) : (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-semibold hover:bg-white/10 ${
                    o.value === value ? 'text-[#1fd8c9]' : 'text-white'
                  }`}
                >
                  {o.icon}
                  <span className="truncate">{o.label}</span>
                </button>
              )
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
