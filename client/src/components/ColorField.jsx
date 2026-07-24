import { useEffect, useRef, useState } from 'react';
import { hexToHsv, hsvToHex } from '../lib/color.js';

function normalizeHex(v) {
  const s = v.trim();
  if (!s) return '';
  return s.startsWith('#') ? s : `#${s}`;
}

function isValidHex(v) {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

// Drives a pointer-drag gesture (mousedown+move+up as one interaction) over
// an element - shared by the saturation/value square and the hue slider,
// which both need "read the pointer position on down, keep reading it as it
// moves anywhere on screen, stop on up" and differ only in what they do with
// that position.
function usePointerDrag(ref, onMove) {
  return function onPointerDown(e) {
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    const update = (clientX, clientY) => onMove(rect, clientX, clientY);
    update(e.clientX, e.clientY);
    function handleMove(ev) {
      update(ev.clientX, ev.clientY);
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };
}

// A fully custom saturation/value square + hue slider popover, replacing the
// native <input type="color"> - that control hands off to whatever colour
// chooser the OS itself ships (a dated, unstyleable dialog on every
// platform), which reads as jarringly out of place next to the rest of this
// app's own design rather than "a modern web app's colour picker".
function ColorPickerPopover({ hex, onChange }) {
  const svRef = useRef(null);
  const hueRef = useRef(null);
  const { h, s, v } = hexToHsv(hex);

  const onSvDown = usePointerDrag(svRef, (rect, clientX, clientY) => {
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    onChange(hsvToHex(h, x, 1 - y));
  });

  const onHueDown = usePointerDrag(hueRef, (rect, clientX) => {
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onChange(hsvToHex(x * 360, s, v));
  });

  return (
    <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#0a1440] p-3 shadow-2xl ring-1 ring-white/10">
      <div
        ref={svRef}
        onPointerDown={onSvDown}
        className="relative h-32 w-full touch-none rounded-lg"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${h}, 100%, 50%)`,
        }}
      >
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }}
        />
      </div>
      <div
        ref={hueRef}
        onPointerDown={onHueDown}
        className="relative mt-3 h-4 w-full touch-none rounded-full"
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{ left: `${(h / 360) * 100}%`, background: `hsl(${h}, 100%, 50%)` }}
        />
      </div>
    </div>
  );
}

// A plain hex text field (types or pastes a #RRGGBB code directly) plus a
// swatch that opens the custom popover above - replaces the native
// <input type="color"> entirely, so every part of the picker is this app's
// own styling rather than a browser/OS-drawn dialog.
export default function ColorField({ label, value, onCommit }) {
  const [draft, setDraft] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const swatchColor = isValidHex(draft) ? draft : isValidHex(value) ? value : '#000000';

  function commitColor(hex) {
    setDraft(hex);
    onCommit(hex);
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={`${label} picker`}
          aria-expanded={open}
          className="h-7 w-7 shrink-0 rounded-md border border-white/20 shadow-sm transition-transform hover:scale-110"
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
      {open && <ColorPickerPopover hex={swatchColor} onChange={commitColor} />}
    </div>
  );
}
