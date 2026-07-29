import { useState } from 'react';

function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 15l6-6M10 7l1-1a3 3 0 114 4l-1 1M14 17l-1 1a3 3 0 01-4-4l1-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A link needs no login and no clipboard/image step to reach whoever it's
// sent to - the reading side of this app is already public (read access
// goes through a plain API key, see lib/sheets.js), only editing requires
// sign-in - so `buildUrl` just needs to point at the right matchday.
export default function CopyLinkButton({ buildUrl, title }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = buildUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Only reachable without a Clipboard API or on an insecure origin -
      // a prompt still lets the link be copied by hand rather than doing
      // nothing.
      window.prompt('Copy this link:', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        title={title ?? 'Copy a sponsor-free link to this matchday'}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-400 shadow-md transition-colors hover:bg-gray-50 hover:text-[#0f1e54]"
      >
        <LinkIcon />
      </button>
      {copied && (
        <span className="absolute -top-1 right-8 z-10 whitespace-nowrap rounded-md bg-[#0f1e54] px-2 py-1 text-[10px] font-semibold text-white shadow-md">
          Link copied!
        </span>
      )}
    </div>
  );
}
