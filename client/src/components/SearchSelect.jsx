import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const inputClass =
  'h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-[#0f1e54] shadow-sm outline-none transition-colors focus:border-[#1fd8c9] focus:bg-white focus:ring-2 focus:ring-[#1fd8c9]/20';

// Ranks a label against the typed query so an exact/prefix match always
// beats a match buried in the middle of a longer name - typing "milan"
// should surface "Milano" before "Cusano Milanino" or "Garbagnate
// Milanese", even though a plain substring filter treats all three as
// equally good matches. Tiers, best first: exact match, the whole label
// starts with it, some individual word in the label starts with it (a
// multi-word name like "Reggio Calabria" matching on its second word),
// then a bare substring match anywhere.
function matchRank(label, q) {
  const l = label.toLowerCase();
  if (l === q) return 0;
  if (l.startsWith(q)) return 1;
  if (l.split(/[^a-z0-9]+/i).some((word) => word && word.startsWith(q))) return 2;
  if (l.includes(q)) return 3;
  return 4;
}

// A type-to-filter single-select from a fixed list of options - the input
// shows the current selection until focused, then opens a live-filtered
// list. The list is portaled to <body> and positioned in viewport
// coordinates (same approach as Dropdown.jsx), so it floats over whatever
// comes after this field instead of pushing it down the page, and can't get
// clipped by a Card's own `overflow-hidden` the way an in-place popup would.
//
// Keyboard: Up/Down moves a highlighted row through the current filtered
// list (mouse hover moves the same highlight, so the two never disagree);
// Tab or Enter picks whatever's highlighted - Tab doesn't preventDefault,
// so it also carries on to the next field the way a browser address bar's
// autocomplete both fills in and moves on with one keystroke. Highlighting
// always starts on the first match, so typing down to exactly one match
// and hitting Tab immediately (no arrow keys needed) fills that one match
// in. On mobile there's no Tab/arrow keys to intercept in the first place -
// tapping an option directly (already just an onClick) is unaffected by
// any of this.
export default function SearchSelect({ value, onChange, options, placeholder = 'Type to search…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [listPos, setListPos] = useState(null);

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  // Memoized so its identity only changes when the ranked result actually
  // does - the position effect below depends on it, and a fresh array every
  // render (even with identical contents) would re-trigger that effect in
  // an infinite loop (it calls setListPos, which re-renders, which would
  // otherwise produce yet another "new" filtered array).
  const filtered = useMemo(
    () =>
      q
        ? options
            .filter((o) => matchRank(o.label, q) < 4)
            .sort((a, b) => {
              const ra = matchRank(a.label, q);
              const rb = matchRank(b.label, q);
              if (ra !== rb) return ra - rb;
              if (a.label.length !== b.label.length) return a.label.length - b.label.length;
              return a.label.localeCompare(b.label);
            })
        : options,
    [options, q]
  );
  const activeIndex = Math.min(highlighted, filtered.length - 1);

  function pick(v) {
    onChange(v);
    setQuery('');
    setOpen(false);
    setHighlighted(0);
  }

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if ((e.key === 'Tab' || e.key === 'Enter') && filtered[activeIndex]) {
      // Enter has no "move to the next field" of its own to preserve, so it
      // needs its default (submitting the form) suppressed - Tab already
      // does exactly what's wanted by default, so it's left alone.
      if (e.key === 'Enter') e.preventDefault();
      pick(filtered[activeIndex].value);
    }
  }

  useLayoutEffect(() => {
    if (!open || !inputRef.current || !listRef.current) {
      setListPos(null);
      return;
    }
    const margin = 8;
    const triggerRect = inputRef.current.getBoundingClientRect();
    const listEl = listRef.current;
    const left = Math.min(Math.max(triggerRect.left, margin), window.innerWidth - listEl.offsetWidth - margin);

    const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;
    // Flip upward when the list doesn't fit in the space below the field
    // but there's more room above it - same reasoning as Dropdown.jsx.
    const openUpward = spaceBelow < listEl.scrollHeight && spaceAbove > spaceBelow;
    setListPos({
      top: openUpward ? triggerRect.top - 4 : triggerRect.bottom + 4,
      left,
      minWidth: triggerRect.width,
      maxHeight: Math.max(120, openUpward ? spaceAbove : spaceBelow),
      openUpward,
    });
  }, [open, filtered]);

  useEffect(() => {
    if (!open) return undefined;
    // The list no longer scrolls along with the field (it's fixed-
    // positioned, portaled out of this field's own scroll container) -
    // closing on any *other* scroll is simpler than trying to keep a
    // portaled popup glued to a field that might be moving under it. The
    // list's own internal scroll fires a real capturing 'scroll' event
    // too, seen here before it reaches the list itself, so it's excluded.
    function handleScroll(e) {
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open]);

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="text"
        value={open ? query : selected?.label ?? ''}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlighted(0);
        }}
        onKeyDown={handleKeyDown}
        // A short delay, not an immediate close, so a click on one of the
        // options below still registers before blur tears the list down.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={inputClass}
      />
      {open &&
        createPortal(
          <div
            ref={listRef}
            className="fixed z-50 w-max max-w-[min(20rem,90vw)] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white shadow-lg"
            style={{
              top: listPos?.top ?? 0,
              left: listPos?.left ?? 0,
              minWidth: listPos ? `${listPos.minWidth}px` : undefined,
              maxHeight: listPos ? `${listPos.maxHeight}px` : '40vh',
              // Rendered above the field by shifting the list up by its own
              // height rather than computing that height up front - the
              // list's content (and thus its real height) isn't known
              // until after this same layout pass measures it.
              transform: listPos?.openUpward ? 'translateY(-100%)' : undefined,
              visibility: listPos ? 'visible' : 'hidden',
            }}
          >
            {value && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick('')}
                className="block w-full border-b border-gray-50 px-2.5 py-1.5 text-left text-xs font-semibold uppercase text-gray-400 hover:bg-gray-50"
              >
                Clear
              </button>
            )}
            {filtered.length > 0 ? (
              filtered.map((o, i) => (
                <button
                  key={o.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o.value)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`block w-full px-2.5 py-1.5 text-left text-sm ${i === activeIndex ? 'bg-[#1fd8c9]/15' : ''} ${
                    o.value === value ? 'font-semibold text-[#1fd8c9]' : 'text-[#0f1e54]'
                  }`}
                >
                  {o.label}
                </button>
              ))
            ) : (
              <p className="px-2.5 py-1.5 text-xs text-gray-400">No match.</p>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
