import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const inputClass =
  'h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-[#0f1e54] shadow-sm outline-none transition-colors focus:border-[#1fd8c9] focus:bg-white focus:ring-2 focus:ring-[#1fd8c9]/20';

// A free-text input with a live substring-filtered list of previously-used
// values underneath - unlike SearchSelect, there's no fixed option set to
// pick from: whatever's typed IS the value, the suggestions are purely a
// shortcut for "I've typed this exact thing before". Used for fields with
// no managed list of their own (Instagram handle, email, a cup competition's
// past round names).
//
// The list is portaled to <body> and positioned in viewport coordinates
// (same approach as Dropdown.jsx/SearchSelect.jsx), so it floats over
// whatever comes after this field instead of pushing it down the page, and
// can't get clipped by a Card's own `overflow-hidden` the way an in-place
// popup would.
//
// Keyboard: Up/Down moves a highlighted suggestion (mouse hover moves the
// same highlight); Tab or Enter replaces the typed text with whichever
// suggestion is highlighted - Tab doesn't preventDefault, so it also moves
// on to the next field the same keystroke, same as SearchSelect. Highlight
// starts on the first match, so narrowing down to exactly one suggestion
// and hitting Tab immediately fills it in with no arrow keys needed. On
// mobile there's no Tab/arrow keys to intercept - tapping a suggestion
// directly (already just an onClick) works the same as before.
export default function SuggestInput({ value, onChange, suggestions, placeholder, type = 'text' }) {
  // Tied to focus, not just "is there a match" - an empty field otherwise
  // matched every suggestion (an empty query is a substring of everything)
  // and, with no way to blur it closed, sat there permanently open on every
  // fixture's guest form. Only shown once something's actually typed too,
  // so it doesn't just repeat the full suggestion list back on focus alone.
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [listPos, setListPos] = useState(null);

  const q = value.trim().toLowerCase();
  // Memoized so its identity only changes when the filtered result actually
  // does - the position effect below depends on it, and a fresh array every
  // render (even an empty one) would re-trigger that effect in an infinite
  // loop (it calls setListPos, which re-renders, which would otherwise
  // produce yet another "new" filtered array).
  const filtered = useMemo(
    () => (q ? suggestions.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q) : []),
    [q, suggestions]
  );
  const activeIndex = Math.min(highlighted, filtered.length - 1);
  const showList = open && filtered.length > 0;

  function pick(s) {
    onChange(s);
    setOpen(false);
    setHighlighted(0);
  }

  function handleKeyDown(e) {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if ((e.key === 'Tab' || e.key === 'Enter') && filtered[activeIndex] !== undefined) {
      if (e.key === 'Enter') e.preventDefault();
      pick(filtered[activeIndex]);
    }
  }

  useLayoutEffect(() => {
    if (!showList || !inputRef.current || !listRef.current) {
      setListPos(null);
      return;
    }
    const margin = 8;
    const triggerRect = inputRef.current.getBoundingClientRect();
    const listEl = listRef.current;
    const left = Math.min(Math.max(triggerRect.left, margin), window.innerWidth - listEl.offsetWidth - margin);

    const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;
    const openUpward = spaceBelow < listEl.scrollHeight && spaceAbove > spaceBelow;
    setListPos({
      top: openUpward ? triggerRect.top - 4 : triggerRect.bottom + 4,
      left,
      minWidth: triggerRect.width,
      maxHeight: Math.max(120, openUpward ? spaceAbove : spaceBelow),
      openUpward,
    });
  }, [showList, filtered]);

  useEffect(() => {
    if (!showList) return undefined;
    function handleScroll(e) {
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showList]);

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setOpen(true)}
        // A short delay, not an immediate close, so a click on one of the
        // suggestions below still registers before blur tears the list down.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClass}
      />
      {showList &&
        createPortal(
          <div
            ref={listRef}
            className="fixed z-50 w-max max-w-[min(20rem,90vw)] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white shadow-lg"
            style={{
              top: listPos?.top ?? 0,
              left: listPos?.left ?? 0,
              minWidth: listPos ? `${listPos.minWidth}px` : undefined,
              maxHeight: listPos ? `${listPos.maxHeight}px` : '40vh',
              transform: listPos?.openUpward ? 'translateY(-100%)' : undefined,
              visibility: listPos ? 'visible' : 'hidden',
            }}
          >
            {filtered.map((s, i) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                onMouseEnter={() => setHighlighted(i)}
                className={`block w-full px-2.5 py-1.5 text-left text-sm text-[#0f1e54] ${i === activeIndex ? 'bg-[#1fd8c9]/15' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
