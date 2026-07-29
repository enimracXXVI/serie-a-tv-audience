// Pill button pairing with useCleanShare() - hides sponsor dots/badges on
// every fixture row below (see FixtureRow's `clean` prop), so a screenshot
// taken right after, or the page's own URL, shows a sponsor-free view.
export default function CleanShareToggle({ clean, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title="Hide sponsor dots/badges - what a screenshot taken now, or this page's link, will show"
      className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
        clean
          ? 'border-[#1fd8c9] bg-[#1fd8c9] text-[#0f1e54]'
          : 'border-[#1fd8c9] bg-transparent text-[#1fd8c9] hover:bg-[#1fd8c9]/10'
      }`}
    >
      Clean share
    </button>
  );
}
