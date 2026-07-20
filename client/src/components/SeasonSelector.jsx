import { SEASONS } from '../lib/seasons.js';

export default function SeasonSelector({ season, onChange }) {
  return (
    <select
      value={season.label}
      onChange={(e) => onChange(SEASONS.find((s) => s.label === e.target.value) ?? SEASONS[0])}
      className="rounded-md border border-transparent bg-white px-2 py-1 text-sm font-bold text-[#0f1e54] outline-none focus:border-[#1fd8c9]"
    >
      {SEASONS.map((s) => (
        <option key={s.label} value={s.label}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
