import { useState } from 'react';

// Settings has grown into a long list of panels - each one collapses behind
// its own title, closed by default, so opening Settings shows a scannable
// list of section names instead of every panel's full contents at once.
export default function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 text-left">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">{title}</h2>
        <span className="text-white/40">{open ? '▾' : '▸'}</span>
      </button>
      {open && children}
    </div>
  );
}
