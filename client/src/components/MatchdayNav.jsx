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

  const mid = Math.ceil(matchdays.length / 2);
  const firstRow = matchdays.slice(0, mid);
  const secondRow = matchdays.slice(mid);

  return (
    <nav className="flex flex-col gap-1.5" aria-label="Jump to matchday">
      <div className="flex flex-wrap gap-1.5">
        {firstRow.map((md) => (
          <Pill key={md} md={md} accent={accent} />
        ))}
      </div>
      {secondRow.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {secondRow.map((md) => (
            <Pill key={md} md={md} accent={accent} />
          ))}
        </div>
      )}
    </nav>
  );
}
