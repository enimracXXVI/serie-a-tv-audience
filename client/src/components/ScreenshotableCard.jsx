import { useRef, useState } from 'react';
import { toBlob } from 'html-to-image';

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

const STATUS_LABEL = {
  copied: 'Copied!',
  downloaded: 'Downloaded (clipboard unsupported)',
  error: 'Copy failed',
};

// Wraps any Dashboard card so a click on the small camera button copies just
// that card to the clipboard as an image (paste straight into a deck/email -
// no file to save and re-attach) - the button itself is excluded from the
// capture via the filter option, and this wrapper adds no visible chrome of
// its own (no background/padding) so it doesn't change how the card already
// looks. The button floats half outside the card's own top-right corner
// (rather than inset over it) so it never sits on top of a card's own
// dropdown/heading content. `background` fills in whatever's behind the card
// in the real page (white for the white chart/table cards, the page's own
// navy for the stat tiles, which are styled dark-on-transparent and would
// otherwise render as invisible white-on-white once captured standalone).
export default function ScreenshotableCard({ filename, background = '#ffffff', children }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleClick() {
    if (!ref.current || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const blob = await toBlob(ref.current, {
        backgroundColor: background,
        pixelRatio: 2,
        filter: (node) => !node?.dataset?.screenshotIgnore,
      });
      if (!blob) throw new Error('Could not render this card');

      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        setStatus('copied');
      } else {
        // Old Safari/Firefox without image clipboard support - fall back to
        // a plain download rather than silently doing nothing.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus('downloaded');
      }
    } catch (err) {
      console.error('Failed to copy card image', err);
      setStatus('error');
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(null), 1800);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        data-screenshot-ignore="true"
        title="Copy this card as an image"
        className="absolute -right-4 -top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-400 shadow-md transition-colors hover:bg-gray-50 hover:text-[#0f1e54] disabled:opacity-50"
      >
        <CameraIcon />
      </button>
      {status && (
        <span
          data-screenshot-ignore="true"
          className="absolute -top-4 right-10 z-10 whitespace-nowrap rounded-md bg-[#0f1e54] px-2 py-1 text-[10px] font-semibold text-white shadow-md"
        >
          {STATUS_LABEL[status]}
        </span>
      )}
      {children}
    </div>
  );
}
