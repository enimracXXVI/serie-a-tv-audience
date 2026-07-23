import { useEffect, useRef, useState } from 'react';

// A small "i" button that reveals its explanatory text in a popover only
// when clicked - every Settings panel used to show this kind of text as a
// permanent paragraph up top, which added a lot of scroll-past prose before
// getting to the actual controls. Click-to-reveal (not hover, which doesn't
// exist on mobile) keeps the panel compact by default.
export default function InfoTip({ text }) {
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

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More info"
        aria-expanded={open}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/30 text-[9px] font-bold leading-none text-white/50 hover:border-white/50 hover:text-white/80"
      >
        i
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-1.5 w-64 -translate-x-1/2 rounded-lg bg-[#0a1440] px-3 py-2 text-xs font-normal normal-case leading-snug tracking-normal text-white/80 shadow-xl ring-1 ring-white/10">
          {text}
        </div>
      )}
    </span>
  );
}
