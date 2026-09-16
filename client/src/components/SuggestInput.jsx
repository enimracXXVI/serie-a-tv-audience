import { useState } from 'react';

const inputClass =
  'h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-[#0f1e54] shadow-sm outline-none transition-colors focus:border-[#1fd8c9] focus:bg-white focus:ring-2 focus:ring-[#1fd8c9]/20';

// A free-text input with a live substring-filtered list of previously-used
// values underneath - unlike SearchSelect, there's no fixed option set to
// pick from: whatever's typed IS the value, the suggestions are purely a
// shortcut for "I've typed this exact thing before". Used for fields with
// no managed list of their own (Instagram handle, email, a cup competition's
// past round names).
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
  const q = value.trim().toLowerCase();
  const filtered = q ? suggestions.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q) : [];
  const activeIndex = Math.min(highlighted, filtered.length - 1);

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

  return (
    <div className="flex flex-col gap-1">
      <input
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
      {open && filtered.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
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
        </div>
      )}
    </div>
  );
}
