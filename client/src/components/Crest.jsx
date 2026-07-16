import { useEffect, useState } from 'react';

// Shared crest URL resolution (custom crestUrl, falling back to the bundled
// placeholder shield on load failure) - reused by the plain <img> below and
// by chart code that needs the same source for an SVG <image> instead.
export function useCrestSrc(team) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [team?.crestUrl, team?.slug]);

  if (!team?.slug) return { src: null, onError: () => {} };

  const staticSrc = `${import.meta.env.BASE_URL}crests/${team.slug}.svg`;
  const src = team.crestUrl && !broken ? team.crestUrl : staticSrc;
  return { src, onError: () => setBroken(true) };
}

export default function Crest({ team, size = 36 }) {
  const { src, onError } = useCrestSrc(team);

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
      src={src}
      alt={`${team.name} crest`}
      loading="lazy"
      onError={onError}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
