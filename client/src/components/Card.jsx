const DEFAULT_ACCENT = '#1fd8c9';
// Every Card in the app uses the same light teal accent, so its title is
// always the app's own navy body-text colour rather than a computed
// contrast colour - keeps every card's header text visually identical to
// the text inside it, not just individually "readable" against the accent.
const TITLE_COLOR = '#0f1e54';

// The shared card shell used across Standings/Dashboard - a solid-colour
// header (teal by default, same treatment as the Serie A Fixtures/Cup round
// cards) instead of a plain white title with a grey bottom border, so every
// card in the app reads as the same visual system.
export default function Card({ title, controls, accent = DEFAULT_ACCENT, children, bodyClassName = 'p-4' }) {
  return (
    <div className="overflow-hidden rounded-2xl shadow-lg shadow-black/20">
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
        style={{ background: accent }}
      >
        <h3 className="text-sm font-bold" style={{ color: TITLE_COLOR }}>
          {title}
        </h3>
        {controls}
      </div>
      <div className={`bg-white ${bodyClassName}`}>{children}</div>
    </div>
  );
}
