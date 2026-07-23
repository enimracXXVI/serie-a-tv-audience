import { useEffect, useRef, useState } from 'react';

// Native <select> can't have its open options list restyled reliably
// across browsers/devices (Android Chrome in particular renders its own
// dark, barely-themed popup no CSS here reaches) - this is a fully custom
// listbox instead, so both the closed pill and the open list are entirely
// our own markup. Two closed-state looks: 'header' (cyan border/text, for
// the sticky page headers) and 'sidebar' (white border/text, for the
// hamburger menu's Settings panels) - the open list itself is always the
// same navy-blue-with-white-text menu regardless of variant.
const CLOSED_VARIANTS = {
  header: 'border-[#1fd8c9] text-[#1fd8c9]',
  sidebar: 'border-white/40 text-white',
};

export default function Dropdown({ value, onChange, options, variant = 'sidebar', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-1.5 rounded-full border bg-transparent px-3 py-1 text-sm font-bold ${CLOSED_VARIANTS[variant]}`}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <span aria-hidden="true" className="shrink-0 text-xs">
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-max min-w-full overflow-y-auto rounded-md bg-[#0f1e54] py-1 shadow-xl ring-1 ring-white/10">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`block w-full whitespace-nowrap px-3 py-1.5 text-left text-sm font-semibold hover:bg-white/10 ${
                o.value === value ? 'text-[#1fd8c9]' : 'text-white'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
