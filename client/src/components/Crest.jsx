export default function Crest({ team, size = 36 }) {
  if (!team?.slug) {
    return (
      <div
        className="rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold"
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }
  return (
    <img
      src={`/crests/${team.slug}.svg`}
      alt={`${team.name} crest`}
      width={size}
      height={size * 1.16}
      style={{ width: size, height: size * 1.16 }}
      loading="lazy"
    />
  );
}
