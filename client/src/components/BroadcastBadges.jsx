// A broadcaster's badge, driven entirely by the `broadcasters` sheet tab
// (name + optional logoUrl) rather than hardcoded artwork - see
// BroadcastersPanel for how a broadcaster's logo is set and which one is
// "main". Falls back to plain text when no logo is configured yet, same
// convention as every other optional-logo entity in this app (competitions,
// cup opponents, cup fixture broadcasters).
export function BroadcasterBadge({ broadcaster, fallbackName, className = 'h-3.5' }) {
  const name = broadcaster?.name || fallbackName;
  if (!name) return null;
  if (broadcaster?.logoUrl) {
    // min-w-0 is load-bearing here, not decorative - a flex item's default
    // min-width is its content's natural size, so without it a wide logo
    // (e.g. a "sky sport" wordmark) refuses to shrink and pushes the row
    // wider than its fixed-width column, which on a narrow phone screen
    // means it gets cut off by the edge of the viewport instead of scaling
    // down to fit.
    return <img src={broadcaster.logoUrl} alt={name} className={`${className} min-w-0 max-w-full object-contain`} />;
  }
  return <span className="min-w-0 truncate text-[9px] font-bold uppercase tracking-wide text-gray-400">{name}</span>;
}
