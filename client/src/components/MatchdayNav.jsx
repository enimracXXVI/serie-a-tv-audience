export default function MatchdayNav({ matchdays, accent = '#1fd8c9' }) {
  if (matchdays.length === 0) return null;

  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Jump to matchday">
      {matchdays.map((md) => (
        <a
          key={md}
          href={`#matchday-${md}`}
          className="flex h-7 min-w-7 items-center justify-center rounded-full border-2 px-2 text-xs font-bold text-white transition-colors"
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
      ))}
    </nav>
  );
}
