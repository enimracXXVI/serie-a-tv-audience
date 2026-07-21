import { useSeasons } from '../lib/useSeasons.jsx';

export default function SeasonSelector({ season, onChange }) {
  const { seasons } = useSeasons();
  return (
    <select
      value={season.label}
      onChange={(e) => onChange(seasons.find((s) => s.label === e.target.value) ?? seasons[0])}
      className="rounded-md border border-transparent bg-white px-2 py-1 text-sm font-bold text-[#0f1e54] outline-none focus:border-[#1fd8c9]"
    >
      {seasons.map((s) => (
        <option key={s.label} value={s.label}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
