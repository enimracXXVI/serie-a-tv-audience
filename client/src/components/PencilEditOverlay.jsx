import { useState } from 'react';

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5" aria-hidden="true">
      <path d="M13.7 2.3a1.5 1.5 0 0 1 2.12 0l1.88 1.88a1.5 1.5 0 0 1 0 2.12L7.4 16.6l-4.2.9.9-4.2Zm-1.06 2.12L4.9 12.16l-.45 2.1 2.1-.45 7.74-7.74Z" />
    </svg>
  );
}

// Click-to-edit for a crest/logo image, styled like an avatar editor - a
// pencil badge sits on the image itself rather than a separate always-live
// text field next to it, so there's no plain input a stray keystroke could
// land in and corrupt a working URL. Wraps whatever preview node (a <Crest>,
// a logo <img>/placeholder box) is passed as children - this component only
// owns the click target, pencil badge and inline edit state.
export default function PencilEditOverlay({ value, onCommit, placeholder = 'Image URL', children, rounded = 'rounded-full' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  function startEditing() {
    setDraft(value ?? '');
    setEditing(true);
  }

  function save() {
    setEditing(false);
    if (draft !== (value ?? '')) onCommit(draft);
  }

  if (editing) {
    return (
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
    );
  }

  return (
    <button type="button" onClick={startEditing} className="relative inline-flex shrink-0" title="Click to edit image URL">
      {children}
      <span
        className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center ${rounded} bg-[#1fd8c9] text-[#0f1e54] shadow ring-2 ring-[#0f1e54]`}
      >
        <PencilIcon />
      </span>
    </button>
  );
}
