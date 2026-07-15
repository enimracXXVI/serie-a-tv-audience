function Pill({ md, accent }) {
  return (
    <a
      href={`#matchday-${md}`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold text-white transition-colors"
      style={{ borderColor: accent }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = accent;
        e.currentTarget.style.color = '#0f1e54';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '';
        e.currentTarget.style.color = '';
      }}
    >
      {md}
    </a>
  );
}

export default function MatchdayNav({ matchdays, accent = '#1fd8c9' }) {
  if (matchdays.length === 0) return null;

  return (
    <nav
      id="matchday-nav"
      className="scroll-mt-4 flex gap-1.5 overflow-x-auto pb-1"
      aria-label="Jump to matchday"
    >
      {matchdays.map((md) => (
        <Pill key={md} md={md} accent={accent} />
      ))}
    </nav>
  );
}
