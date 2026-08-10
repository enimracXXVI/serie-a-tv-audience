import { useState } from 'react';

// Settings has grown into a long list of panels - each one collapses behind
// its own title, closed by default, so opening Settings shows a scannable
// list of section names instead of every panel's full contents at once.
// `sub` is for a section nested inside another one (e.g. TeamsPanel's
// "Current roster"/"National"/"European" inside the "Teams" section) -
// same collapse behaviour, but visually smaller/quieter so it doesn't read
// as another top-level section at a glance.
export default function CollapsibleSection({ title, defaultOpen = false, sub = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 text-left">
        <h2
          className={
            sub
              ? 'text-xs font-semibold uppercase tracking-wide text-white/45'
              : 'text-sm font-bold uppercase tracking-wide text-white/70'
          }
        >
          {title}
        </h2>
        <span className="text-white/40">{open ? '▾' : '▸'}</span>
      </button>
      {open && children}
    </div>
  );
}
