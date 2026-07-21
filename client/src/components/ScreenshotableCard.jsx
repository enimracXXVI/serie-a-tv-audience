import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

// Wraps any Dashboard card so a click on the small camera button downloads
// just that card as a PNG - the button itself is excluded from the capture
// via the filter option, and this wrapper adds no visible chrome of its own
// (no background/padding) so it doesn't change how the card already looks.
// `background` fills in whatever's behind the card in the real page (white
// for the white chart/table cards, the page's own navy for the stat tiles,
// which are styled dark-on-transparent and would otherwise render as
// invisible white-on-white once captured standalone).
export default function ScreenshotableCard({ filename, background = '#ffffff', children }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(ref.current, {
        backgroundColor: background,
        pixelRatio: 2,
        filter: (node) => !node?.dataset?.screenshotIgnore,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${filename}.png`;
      a.click();
    } catch (err) {
      console.error('Failed to capture card as an image', err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        data-screenshot-ignore="true"
        title="Save this card as an image"
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-400 shadow transition-colors hover:bg-white hover:text-[#0f1e54] disabled:opacity-50"
      >
        <CameraIcon />
      </button>
      {children}
    </div>
  );
}
