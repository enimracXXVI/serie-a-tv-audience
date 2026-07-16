import { useEffect, useState } from 'react';

export default function Crest({ team, size = 36 }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [team?.crestUrl, team?.slug]);

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

  const staticSrc = `${import.meta.env.BASE_URL}crests/${team.slug}.svg`;
  const src = team.crestUrl && !broken ? team.crestUrl : staticSrc;

  return (
    <img
      src={src}
      alt={`${team.name} crest`}
      loading="lazy"
      onError={() => setBroken(true)}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
