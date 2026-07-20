import { useEffect, useState } from 'react';

// Shared crest URL resolution (custom crestUrl, falling back to the bundled
// placeholder shield on load failure) - reused by the plain <img> below and
// by chart code that needs the same source for an SVG <image> instead.
// `allBroken` is true once both the custom URL (if any) and the bundled
// static shield have failed - only ever happens for a slug with no bundled
// asset (e.g. a cup opponent typed in via Settings) and no crestUrl set, but
// worth handling rather than leaving a permanently broken <img>.
export function useCrestSrc(team) {
  const [customBroken, setCustomBroken] = useState(false);
  const [staticBroken, setStaticBroken] = useState(false);

  useEffect(() => {
    setCustomBroken(false);
    setStaticBroken(false);
  }, [team?.crestUrl, team?.slug]);

  if (!team?.slug) return { src: null, onError: () => {}, allBroken: true };

  const staticSrc = `${import.meta.env.BASE_URL}crests/${team.slug}.svg`;
  const usingCustom = Boolean(team.crestUrl) && !customBroken;
  const src = usingCustom ? team.crestUrl : staticSrc;
  const allBroken = staticBroken && (!team.crestUrl || customBroken);

  function onError() {
    if (usingCustom) setCustomBroken(true);
    else setStaticBroken(true);
  }

  return { src, onError, allBroken };
}

function Placeholder({ team, size }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-500"
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.35) }}
    >
      {team?.short ? team.short.slice(0, 2) : '?'}
    </div>
  );
}

export default function Crest({ team, size = 36 }) {
  const { src, onError, allBroken } = useCrestSrc(team);

  if (!team?.slug || allBroken) {
    return <Placeholder team={team} size={size} />;
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
