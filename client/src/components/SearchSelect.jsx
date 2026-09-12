import { useState } from 'react';

const inputClass =
  'h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-[#0f1e54] shadow-sm outline-none transition-colors focus:border-[#1fd8c9] focus:bg-white focus:ring-2 focus:ring-[#1fd8c9]/20';

// A type-to-filter single-select from a fixed list of options - the input
// shows the current selection until focused, then switches to a live
// substring-filtered list rendered in-flow right below it (not an
// absolutely-positioned popup like Dropdown.jsx) so it can't get clipped by
// a Card's own `overflow-hidden` the way a portal-free popup would (see
// GuestForm's ReuseGuestPicker, which hit exactly this).
export default function SearchSelect({ value, onChange, options, placeholder = 'Type to search…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  function pick(v) {
    onChange(v);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        type="text"
        value={open ? query : selected?.label ?? ''}
        onFocus={() => setOpen(true)}
        onChange={(e) => setQuery(e.target.value)}
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
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.value)}
                className={`block w-full px-2.5 py-1.5 text-left text-sm hover:bg-gray-50 ${
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
