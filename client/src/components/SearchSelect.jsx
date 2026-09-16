import { useState } from 'react';

const inputClass =
  'h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-[#0f1e54] shadow-sm outline-none transition-colors focus:border-[#1fd8c9] focus:bg-white focus:ring-2 focus:ring-[#1fd8c9]/20';

// A type-to-filter single-select from a fixed list of options - the input
// shows the current selection until focused, then switches to a live
// substring-filtered list rendered in-flow right below it (not an
// absolutely-positioned popup like Dropdown.jsx) so it can't get clipped by
// a Card's own `overflow-hidden` the way a portal-free popup would (see
// GuestForm's ReuseGuestPicker, which hit exactly this).
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

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
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

  return (
    <div className="flex flex-col gap-1">
      <input
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
      {open && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
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
        </div>
      )}
    </div>
  );
}
