import { useState } from 'react';

export default function MatchdaySelector({ matchdays, selected, onChange }) {
  const [open, setOpen] = useState(false);
  if (matchdays.length === 0) return null;

  const idx = selected === 'all' ? -1 : matchdays.indexOf(selected);
  const label = selected === 'all' ? 'All matchdays' : `Matchday ${selected}`;

  function step(delta) {
    if (selected === 'all') return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= matchdays.length) return;
    onChange(matchdays[nextIdx]);
  }

  return (
    <div id="matchday-nav" className="scroll-mt-4 flex items-center gap-2">
      <button
        onClick={() => step(-1)}
        disabled={selected === 'all' || idx <= 0}
        aria-label="Previous matchday"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#1fd8c9] text-lg font-bold text-[#1fd8c9] transition-opacity disabled:opacity-30"
      >
        ‹
      </button>

      <div className="relative flex-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full rounded-full border-2 border-[#1fd8c9] px-4 py-1.5 text-center text-sm font-bold uppercase tracking-wide text-[#1fd8c9] transition-colors hover:bg-[#1fd8c9]/10"
        >
          {label}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-xl">
              <button
                onClick={() => {
                  onChange('all');
                  setOpen(false);
                }}
                className={`block w-full rounded-md px-3 py-1.5 text-left text-sm font-semibold ${
                  selected === 'all' ? 'bg-[#1fd8c9]/20 text-[#0f1e54]' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All matchdays
              </button>
              {matchdays.map((md) => (
                <button
                  key={md}
                  onClick={() => {
                    onChange(md);
                    setOpen(false);
                  }}
                  className={`block w-full rounded-md px-3 py-1.5 text-left text-sm font-semibold ${
                    selected === md ? 'bg-[#1fd8c9]/20 text-[#0f1e54]' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Matchday {md}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => step(1)}
        disabled={selected === 'all' || idx === -1 || idx >= matchdays.length - 1}
        aria-label="Next matchday"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#1fd8c9] text-lg font-bold text-[#1fd8c9] transition-opacity disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
}
