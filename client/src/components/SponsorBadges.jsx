const BADGE_DEFS = [
  { key: 'matchdaySponsor', label: 'MS', title: 'Matchday sponsor', className: 'bg-amber-100 text-amber-700' },
  { key: 'playerMascot', label: 'PM', title: 'Player mascot', className: 'bg-purple-100 text-purple-700' },
  { key: 'walkabout', label: 'WA', title: 'Walkabout', className: 'bg-teal-100 text-teal-700' },
];

// Small always-visible markers for a sponsored club's in-stadium activity at
// a specific fixture - set from the home page's Sponsors tab, shown
// everywhere that fixture is displayed regardless of sign-in state.
export default function SponsorBadges({ matchdaySponsor, playerMascot, walkabout, className = '' }) {
  const flags = { matchdaySponsor, playerMascot, walkabout };
  const active = BADGE_DEFS.filter((b) => flags[b.key]);
  if (active.length === 0) return null;

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {active.map((b) => (
        <span
          key={b.key}
          title={b.title}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[7px] font-bold ${b.className}`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
