import { contrastText } from '../lib/color.js';

const DEFAULT_ACCENT = '#1fd8c9';

// The shared card shell used across Standings/Dashboard - a solid-colour
// header (teal by default, same treatment as the Serie A Fixtures/Cup round
// cards) instead of a plain white title with a grey bottom border, so every
// card in the app reads as the same visual system.
export default function Card({ title, controls, accent = DEFAULT_ACCENT, children, bodyClassName = 'p-4' }) {
  const textColor = contrastText(accent);
  return (
    <div className="overflow-hidden rounded-2xl shadow-lg shadow-black/20">
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
        style={{ background: accent }}
      >
        <h3 className="text-sm font-bold" style={{ color: textColor }}>
          {title}
        </h3>
        {controls}
      </div>
      <div className={`bg-white ${bodyClassName}`}>{children}</div>
    </div>
  );
}
