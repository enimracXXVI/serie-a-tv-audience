const inputClass =
  'h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-[#0f1e54] shadow-sm outline-none transition-colors focus:border-[#1fd8c9] focus:bg-white focus:ring-2 focus:ring-[#1fd8c9]/20';

// A free-text input with a live substring-filtered list of previously-used
// values underneath - unlike SearchSelect, there's no fixed option set to
// pick from: whatever's typed IS the value, the suggestions are purely a
// shortcut for "I've typed this exact thing before". Used for fields with
// no managed list of their own (Instagram handle, email, a cup competition's
// past round names).
export default function SuggestInput({ value, onChange, suggestions, placeholder, type = 'text' }) {
  const q = value.trim().toLowerCase();
  const filtered = suggestions.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q);

  return (
    <div className="flex flex-col gap-1">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      {filtered.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="block w-full px-2.5 py-1.5 text-left text-sm text-[#0f1e54] hover:bg-gray-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
