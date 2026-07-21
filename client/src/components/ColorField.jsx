import { useEffect, useState } from 'react';

function normalizeHex(v) {
  const s = v.trim();
  if (!s) return '';
  return s.startsWith('#') ? s : `#${s}`;
}

function isValidHex(v) {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

// A plain hex text field (types or pastes a #RRGGBB code directly) with a
// small readonly preview swatch - replaces the native <input type="color">
// picker, whose only interaction is a browser-drawn popup with no way to
// paste a hex code into it.
export default function ColorField({ label, value, onCommit }) {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const swatchColor = isValidHex(draft) ? draft : isValidHex(value) ? value : 'transparent';

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</span>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-7 w-7 shrink-0 rounded border border-white/20"
          style={{ background: swatchColor }}
        />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(normalizeHex(e.target.value))}
          onBlur={() => {
            if (isValidHex(draft) && draft !== value) onCommit(draft);
          }}
          placeholder="#000000"
          maxLength={7}
          className="w-24 rounded-md border border-white/20 bg-white/5 px-2 py-1 font-mono text-xs text-white outline-none focus:border-[#1fd8c9]"
        />
      </div>
    </label>
  );
}
