export default function ToggleSwitch({ checked, onChange, label, title, disabled = false, labelClassName = 'text-white/70' }) {
  return (
    <label
      className={`flex items-center gap-2 text-xs font-semibold ${labelClassName} ${disabled ? 'opacity-40' : ''}`}
      title={title}
    >
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
      {label}
    </label>
  );
}
