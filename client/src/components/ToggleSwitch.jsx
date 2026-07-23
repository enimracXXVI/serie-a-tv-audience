// Label sits above the switch, centered, in the same small-caps uppercase
// style every other Settings field label uses (see Field components across
// TeamsPanel/TeamSeasonsPanel/CupFixtureRow) - a toggle is a field like any
// other, so its label shouldn't look different from a text input's.
export default function ToggleSwitch({ checked, onChange, label, title, disabled = false, labelClassName = 'text-white/40' }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${disabled ? 'opacity-40' : ''}`} title={title}>
      {label && <span className={`text-[10px] font-semibold uppercase tracking-wide ${labelClassName}`}>{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#1fd8c9]' : 'bg-gray-300'} ${
          disabled ? 'cursor-not-allowed' : ''
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
