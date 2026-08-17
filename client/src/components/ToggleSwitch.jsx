// Label sits above the switch, centered, in the same small-caps uppercase
// style every other Settings field label uses (see Field components across
// TeamsPanel/TeamSeasonsPanel/CupFixtureRow) - a toggle is a field like any
// other, so its label shouldn't look different from a text input's.
// onColor defaults to the app's teal accent - but a toggle sitting inside a
// Card's own teal header needs a different "on" colour, or a checked track
// would blend straight into the header behind it (see TopGamesList's "Home
// only" toggle) rather than reading as visibly switched on.
export default function ToggleSwitch({
  checked,
  onChange,
  label,
  title,
  disabled = false,
  labelClassName = 'text-white/40',
  onColor = 'bg-[#1fd8c9]',
}) {
  return (
    <div className={`flex flex-col items-center gap-1 ${disabled ? 'opacity-40' : ''}`} title={title}>
      {label && <span className={`text-[10px] font-semibold uppercase tracking-wide ${labelClassName}`}>{label}</span>}
      {/* h-9 slot matches every other field's box height (see Dropdown.jsx's
          trigger for the same fix) so this control's label starts at the
          same height as a text/number/date input's label next to it -
          stretching the switch itself to 36px tall would just look broken,
          so it keeps its normal compact size and centers inside the slot. */}
      <div className="flex h-9 items-center">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? onColor : 'bg-gray-300'} ${
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
    </div>
  );
}
