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
// the instant a single value is picked) - each row toggles its own value in
// `values` via a checkbox instead of replacing the whole selection. Shares
// Dropdown's portal-to-<body> positioning (see its own comment for why a
// short overflow-hidden fixture-row card would otherwise clip the list).
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
    const desiredLeft = triggerRect.left + triggerRect.width / 2 - listWidth / 2;
    const left = Math.min(Math.max(desiredLeft, margin), window.innerWidth - listWidth - margin);
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
            className="fixed z-50 max-h-[70vh] w-max max-w-[min(20rem,90vw)] overflow-y-auto rounded-md bg-[#0f1e54] py-1 shadow-xl ring-1 ring-white/10"
            style={{
              top: listPos?.top ?? 0,
              left: listPos?.left ?? 0,
              minWidth: listPos ? `${listPos.minWidth}px` : undefined,
              visibility: listPos ? 'visible' : 'hidden',
            }}
          >
            {options.map((o) => {
              const checked = values.includes(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => toggleValue(o.value)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-semibold text-white hover:bg-white/10"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[10px] leading-none ${
                      checked ? 'border-[#1fd8c9] bg-[#1fd8c9] text-[#0f1e54]' : 'border-white/40'
                    }`}
                  >
                    {checked && '✓'}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
