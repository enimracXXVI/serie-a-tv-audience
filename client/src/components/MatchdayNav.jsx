export default function MatchdayNav({ matchdays, accent = '#00a651' }) {
  if (matchdays.length === 0) return null;

  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Jump to matchday">
      {matchdays.map((md) => (
        <a
          key={md}
          href={`#matchday-${md}`}
          className="flex h-7 min-w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-white"
          style={{ '--hover-border': accent }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
        >
          {md}
        </a>
      ))}
    </nav>
  );
}
