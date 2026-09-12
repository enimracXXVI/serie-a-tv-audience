import { useState } from 'react';
import { useGuestSources } from '../lib/useGuestSources.jsx';
import { callWithReauth } from '../lib/reauth.js';
import { useConfirm } from '../lib/useConfirm.jsx';
import ToggleSwitch from './ToggleSwitch.jsx';
import InfoTip from './InfoTip.jsx';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function GuestSourceRow({ source, session, saveGuestSource, removeGuestSource }) {
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  async function toggleRequiresInstagram(v) {
    setError(null);
    try {
      await callWithReauth(session, (token) => saveGuestSource(source.slug, { requiresInstagram: v }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!(await confirm(`Delete "${source.name}"? Any guest already tagged with it keeps the old value, it just won't be pickable anymore.`))) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await callWithReauth(session, (token) => removeGuestSource(source.slug, token));
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white/5 px-3 py-2">
      {confirmDialog}
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:gap-3">
        <span className="truncate text-sm font-semibold text-white">{source.name}</span>
        {session.signedIn ? (
          <div className="flex items-center gap-3 justify-self-end">
            <ToggleSwitch
              checked={Boolean(source.requiresInstagram)}
              onChange={toggleRequiresInstagram}
              label="Needs IG"
              labelClassName="text-white/40"
            />
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-fit shrink-0 rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-semibold uppercase text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        ) : (
          <span />
        )}
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

export default function GuestSourcesPanel({ session }) {
  const { guestSources, loading, saveGuestSource, createGuestSource, removeGuestSource } = useGuestSources();
  const [newName, setNewName] = useState('');
  const [newRequiresInstagram, setNewRequiresInstagram] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) {
      setCreateError('Enter a source name.');
      return;
    }
    try {
      const trimmed = newName.trim();
      await callWithReauth(session, (token) =>
        createGuestSource({ name: trimmed, slug: slugify(trimmed), requiresInstagram: newRequiresInstagram }, token)
      );
      setNewName('');
      setNewRequiresInstagram(false);
    } catch (err) {
      setCreateError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <InfoTip
            text={
              'What a Hospitality guest is picked from - "where they came from" (content creator, partner, ...). ' +
              'Turn on "Needs IG" for a category (e.g. Content creator) to have GuestForm also ask for an Instagram handle whenever that category is selected.'
            }
          />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/30">About this section</span>
        </div>
        {session.signedIn && (
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
              showAddForm ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Add source {showAddForm ? '▴' : '▾'}
          </button>
        )}
      </div>
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to add or edit guest sources.</p>}
      {session.signedIn && showAddForm && (
        <div className="flex flex-col gap-2">
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-lg bg-white/5 px-3 py-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New source name"
              className={`${inputClass} w-44`}
            />
            <ToggleSwitch checked={newRequiresInstagram} onChange={setNewRequiresInstagram} label="Needs IG" labelClassName="text-white/40" />
            <button type="submit" className="rounded-md bg-[#1fd8c9] px-3 py-1.5 text-xs font-bold text-[#0f1e54] hover:brightness-95">
              Add
            </button>
          </form>
          {createError && <p className="text-xs text-red-300">{createError}</p>}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : guestSources.length === 0 ? (
        <p className="text-sm text-white/40">No sources yet - add one above.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {guestSources.map((s) => (
            <GuestSourceRow key={s.slug} source={s} session={session} saveGuestSource={saveGuestSource} removeGuestSource={removeGuestSource} />
          ))}
        </div>
      )}
    </div>
  );
}
