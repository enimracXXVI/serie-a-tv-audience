import { useEffect, useState } from 'react';

// Click-to-edit URL field - shows the current value as plain (non-editable)
// text with an Edit button, rather than a permanently-live text input. A
// crest/logo URL is long and easy to click into by accident; a stray
// keystroke there silently corrupts a working image link. Editing only
// starts on an explicit click, and Escape/blur-without-save discards the
// draft rather than committing a half-typed edit.
export default function UrlField({ label, value, onCommit, placeholder = 'https://…', disabled = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  function startEditing() {
    setDraft(value ?? '');
    setEditing(true);
  }

  function save() {
    setEditing(false);
    if (draft !== (value ?? '')) onCommit(draft);
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setEditing(false);
            }}
            placeholder={placeholder}
            className="w-full min-w-0 flex-1 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9]"
          />
          <button
            type="button"
            onClick={save}
            className="shrink-0 rounded-md bg-[#1fd8c9] px-2.5 py-1 text-xs font-bold text-[#0f1e54] hover:brightness-95"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60">
            {value || 'Not set'}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={startEditing}
              className="shrink-0 rounded-md border border-white/20 px-2.5 py-1 text-xs font-semibold text-white/70 hover:bg-white/10"
            >
              Edit
            </button>
          )}
        </div>
      )}
    </label>
  );
}
