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
    return <img src={broadcaster.logoUrl} alt={name} className={`${className} w-auto object-contain`} />;
  }
  return <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{name}</span>;
}
