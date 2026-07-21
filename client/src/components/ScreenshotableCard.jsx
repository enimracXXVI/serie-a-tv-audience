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
};

// A crest/logo hosted on another domain without CORS headers can't be
// fetched and inlined as a data URL (html-to-image already catches that
// fetch failure internally) - but it then sets the cloned <img>'s src to
// an empty string as its fallback, which fires the image's onerror and
// rejects the ENTIRE capture over one broken image. Handing it a real (if
// blank) placeholder image avoids that path entirely, which is what was
// silently failing every capture that included an external crest.
const BLANK_IMAGE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

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
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ScreenshotableCard({ filename, background = '#ffffff', children }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  function finish(nextStatus) {
    setStatus(nextStatus);
    setBusy(false);
    // Errors stay up longer - long enough to actually read (or screenshot)
    // the message, since it's the only diagnostic a report from someone
    // else's phone is ever going to come with.
    setTimeout(() => setStatus(null), nextStatus?.type === 'error' ? 4500 : 1800);
  }

  function handleClick() {
    if (!ref.current || busy) return;
    setBusy(true);
    setStatus(null);

    const renderPromise = toBlob(ref.current, {
      backgroundColor: background,
      pixelRatio: 2,
      cacheBust: true,
      imagePlaceholder: BLANK_IMAGE_PLACEHOLDER,
      filter: (node) => !node?.dataset?.screenshotIgnore,
    }).then((blob) => {
      if (!blob) throw new Error('Could not render this card');
      return blob;
    });

    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      // navigator.clipboard.write() must be called synchronously inside the
      // click handler, not after an awaited render - Safari and most mobile
      // browsers revoke the "recent user gesture" a clipboard write needs by
      // the time an awaited html-to-image render finishes, which is exactly
      // why this silently failed on mobile. Handing ClipboardItem a Promise
      // instead of an already-resolved Blob keeps the write() call itself
      // synchronous while still waiting on the render.
      navigator.clipboard
        .write([new ClipboardItem({ 'image/png': renderPromise })])
        .then(() => finish('copied'))
        .catch((err) => {
          // ClipboardItem existing doesn't mean an image/png write is
          // actually supported - Firefox (especially on Android) has
          // rejected this for real image data even when the constructor is
          // present. Rather than dead-end on an error, fall back to a
          // download the same way a browser with no Clipboard API at all
          // already does below - the render itself already succeeded.
          console.warn('Clipboard image write unsupported, falling back to download', err);
          renderPromise
            .then((blob) => {
              downloadBlob(blob, filename);
              finish('downloaded');
            })
            .catch((renderErr) => {
              console.error('Failed to render card image', renderErr);
              finish({ type: 'error', message: renderErr?.message || String(renderErr) });
            });
        });
    } else {
      // Old Safari/Firefox without image clipboard support - fall back to a
      // plain download rather than silently doing nothing.
      renderPromise
        .then((blob) => {
          downloadBlob(blob, filename);
          finish('downloaded');
        })
        .catch((err) => {
          console.error('Failed to copy card image', err);
          finish({ type: 'error', message: err?.message || String(err) });
        });
    }
  }

  return (
    // flex/h-full (plus stretching the card's own content, the last child
    // here, to fill any extra space) lets two cards side by side in a grid
    // row match height instead of each just being as tall as its own
    // content - the grid row itself only stretches its direct children if
    // they're actually able to grow to fill it.
    <div ref={ref} className="relative flex h-full flex-col [&>:last-child]:flex [&>:last-child]:flex-1 [&>:last-child]:flex-col">
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
          className={`absolute -top-4 right-10 z-10 max-w-[220px] rounded-md px-2 py-1 text-[10px] font-semibold text-white shadow-md ${
            status.type === 'error' ? 'bg-red-600' : 'whitespace-nowrap bg-[#0f1e54]'
          }`}
        >
          {status.type === 'error' ? `Copy failed: ${status.message}` : STATUS_LABEL[status]}
        </span>
      )}
      {children}
    </div>
  );
}
