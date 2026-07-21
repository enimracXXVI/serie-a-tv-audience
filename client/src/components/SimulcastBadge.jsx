// Shared by every "games list" on the Dashboard (Top games, the heatmap/
// breakdown/opponent modals) so "was this played alongside anything else"
// looks and reads the same everywhere. Fixed width and always rendered
// (never conditionally hidden) so a row/game without a shared slot doesn't
// shift everything after it - a blank space where a badge could have been
// would misalign that row against its neighbours.
export default function SimulcastBadge({ fixture, simulcastInfo }) {
  const info = simulcastInfo?.get(fixture.id);
  const otherCount = info ? info.blockSize - 1 : 0;
  return (
    <span
      title={
        otherCount > 0
          ? `Shared its exact kickoff slot with ${otherCount} other game(s)`
          : 'Only game at this exact kickoff slot'
      }
      className={`w-14 shrink-0 rounded-full px-1.5 py-0.5 text-center text-[9px] font-bold ${
        otherCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
      }`}
    >
      {otherCount > 0 ? `+${otherCount} slot` : 'Solo'}
    </span>
  );
}
