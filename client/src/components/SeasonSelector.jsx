import { useSeasons } from '../lib/useSeasons.jsx';

// Cyan-outlined pill matching the app's other header controls - border,
// text and arrow all in the same cyan used everywhere else for emphasis,
// with a transparent fill so the header's own background shows through
// rather than fighting it with a mismatched flat colour. The native
// <select> arrow can't be recoloured, so it's hidden (appearance-none) and
// replaced with a plain cyan chevron positioned over it.
export default function SeasonSelector({ season, onChange }) {
  const { seasons } = useSeasons();
  return (
    <div className="relative inline-flex items-center">
      <select
        value={season.label}
        onChange={(e) => onChange(seasons.find((s) => s.label === e.target.value) ?? seasons[0])}
        className="appearance-none rounded-full border border-[#1fd8c9] bg-transparent py-1 pl-3 pr-7 text-sm font-bold text-[#1fd8c9] outline-none"
      >
        {seasons.map((s) => (
          <option key={s.label} value={s.label} className="text-[#0f1e54]">
            {s.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-2.5 text-xs text-[#1fd8c9]">
        ▾
      </span>
    </div>
  );
}
