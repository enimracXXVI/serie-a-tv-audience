import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Same closed-pill look as Dropdown.jsx - kept in sync with its
// CLOSED_VARIANTS rather than imported, since the two components are meant
// to read as siblings (single-pick vs multi-pick) wherever either shows up,
// not as one reaching into the other's internals.
const CLOSED_VARIANTS = {
  header: 'rounded-full border-[#1fd8c9] bg-transparent text-[#1fd8c9]',
  sidebar: 'rounded-full border-white/40 bg-transparent text-white',
  light: 'rounded-lg border-gray-200 bg-gray-50 text-[#0f1e54]',
  tealHeader: 'rounded-full border-[#0f1e54]/50 bg-white/25 text-[#0f1e54]',
};

// A cup fixture can air on several broadcasters at once, so picking them
// needs to stay open across multiple clicks (unlike Dropdown, which closes
// the instant a single value is picked) - each tile toggles its own value in
// `values` instead of replacing the whole selection. Shares Dropdown's
// portal-to-<body> positioning (see its own comment for why a short
// overflow-hidden fixture-row card would otherwise clip the list) and its
// left-aligned-to-trigger placement and scroll handling.
export default function MultiSelectDropdown({ values, onChange, options, variant = 'light', placeholder = 'None', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);
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

  // See Dropdown.jsx's identical listener for why this is needed alongside
  // `overscroll-contain` - a grid with few enough rows to never actually
  // scroll would otherwise chain straight into the page and get read as
  // "the page moved, close this" by the listener above.
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

  function toggleValue(v) {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  }

  const label = options
    .filter((o) => values.includes(o.value))
    .map((o) => o.label)
    .join(', ');

  return (
    <div ref={ref} className={`relative inline-block min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-1.5 border px-3 py-1 text-sm font-bold ${CLOSED_VARIANTS[variant]}`}
      >
        <span className={`truncate ${label ? '' : 'opacity-50'}`}>{label || placeholder}</span>
        <span aria-hidden="true" className="shrink-0 text-xs">
          ▾
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={listRef}
            className="fixed z-50 max-h-[70vh] w-max max-w-[min(20rem,90vw)] overflow-y-auto overscroll-contain rounded-md bg-[#0f1e54] p-2 shadow-xl ring-1 ring-white/10"
            style={{
              top: listPos?.top ?? 0,
              left: listPos?.left ?? 0,
              minWidth: listPos ? `${listPos.minWidth}px` : undefined,
              visibility: listPos ? 'visible' : 'hidden',
            }}
          >
            {/* Tile grid, same visual language as TeamPicker's own "Build
                calendar" team grid - a filled teal tile reads as "selected"
                at a glance the same way there, rather than a checkbox row
                that looked like every other single-pick dropdown despite
                behaving completely differently (staying open, multi-pick). */}
            <div className="grid grid-cols-2 gap-1.5">
              {options.map((o) => {
                const checked = values.includes(o.value);
                return (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => toggleValue(o.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 text-center transition-all ${
                      checked ? 'border-[#1fd8c9] bg-[#1fd8c9] shadow-md' : 'border-transparent bg-white/10 hover:border-[#1fd8c9]/40'
                    }`}
                  >
                    {o.logoUrl ? (
                      <img src={o.logoUrl} alt="" className="h-5 max-w-full object-contain" />
                    ) : (
                      <span className={`h-5 text-lg leading-5 ${checked ? 'text-[#0f1e54]' : 'text-white/70'}`}>📺</span>
                    )}
                    <span className={`truncate text-[11px] font-semibold ${checked ? 'text-[#0f1e54]' : 'text-white'}`}>{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
