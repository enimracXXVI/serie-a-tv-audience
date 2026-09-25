// Same slider idiom as StandingsChart's matchday cutoff - a plain range
// input plus its own min/max readout underneath, rather than a styled
// component library control, so it matches the rest of the app's controls.
export default function MatchdaySlider({ value, max, onChange }) {
  if (!max || max <= 1) return null;
  return (
    <div className="mb-3">
      <input
        type="range"
        min={1}
        max={max}
        value={value ?? max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#1fd8c9]"
      />
      <div className="flex justify-between text-[10px] font-semibold text-gray-400">
        <span>Matchday 1</span>
        <span>Matchday {max}</span>
      </div>
    </div>
  );
}
