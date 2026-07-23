import { useState } from 'react';
import { useCupData } from '../lib/useCupData.jsx';
import { callWithReauth } from '../lib/reauth.js';
import { useConfirm } from '../lib/useConfirm.jsx';
import PencilEditOverlay from './PencilEditOverlay.jsx';
import InfoTip from './InfoTip.jsx';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

// Rectangular logo preview box - a broadcaster logotype is typically a wide
// wordmark, not an icon, so it stays object-contain in a plain box rather
// than getting cropped into a circle like a team crest.
function LogoPreview({ url }) {
  return (
    <div className="flex h-8 w-14 items-center justify-center rounded-md bg-white/10">
      {url ? (
        <img src={url} alt="" className="max-h-full max-w-full object-contain" />
      ) : (
        <span className="text-[9px] font-semibold uppercase text-white/30">Logo</span>
      )}
    </div>
  );
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function BroadcasterRow({ broadcaster, session, saveBroadcaster, onSetMain, removeBroadcaster }) {
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  async function commit(logoUrl) {
    setError(null);
    try {
      await callWithReauth(session, (token) => saveBroadcaster(broadcaster.slug, { logoUrl }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  async function setMain() {
    setError(null);
    try {
      await onSetMain(broadcaster.slug);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!(await confirm(`Delete "${broadcaster.name}"? This can't be undone from here - you'd need to re-add it by hand.`))) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await callWithReauth(session, (token) => removeBroadcaster(broadcaster.slug, token));
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white/5 px-3 py-2">
      {confirmDialog}
      <div className="flex flex-wrap items-center gap-3">
        <PencilEditOverlay value={broadcaster.logoUrl} onCommit={commit} rounded="rounded-md">
          <LogoPreview url={broadcaster.logoUrl} />
        </PencilEditOverlay>
        <span className="text-sm font-semibold text-white">{broadcaster.name}</span>
        {broadcaster.isMain && (
          <span className="rounded-full bg-[#1fd8c9]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#1fd8c9]">
            Main
          </span>
        )}
        {session.signedIn && (
          <div className="ml-auto flex items-center gap-2">
            {!broadcaster.isMain && (
              <button onClick={setMain} className="text-[10px] font-semibold uppercase text-white/50 hover:text-white">
                Set as main
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-fit rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-semibold uppercase text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

export default function BroadcastersPanel({ session }) {
  const { broadcasters, loading, error, saveBroadcaster, createBroadcaster, removeBroadcaster } = useCupData();
  const [newName, setNewName] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [createError, setCreateError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) {
      setCreateError('Enter a broadcaster name.');
      return;
    }
    try {
      const trimmed = newName.trim();
      await callWithReauth(session, (token) =>
        createBroadcaster({ name: trimmed, slug: slugify(trimmed), logoUrl: newLogoUrl.trim() }, token)
      );
      setNewName('');
      setNewLogoUrl('');
    } catch (err) {
      setCreateError(err.message);
    }
  }

  async function handleSetMain(slug) {
    const prevMain = broadcasters.find((b) => b.isMain);
    await callWithReauth(session, async (token) => {
      if (prevMain && prevMain.slug !== slug) {
        await saveBroadcaster(prevMain.slug, { isMain: false }, token);
      }
      await saveBroadcaster(slug, { isMain: true }, token);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <InfoTip text={'Mark exactly one broadcaster as main (e.g. DAZN) - its name/logo replaces every hardcoded "DAZN" label on the Serie A calendar and Dashboard. Every other broadcaster here (e.g. Sky Sport) becomes a per-fixture "other broadcaster" choice - pick one when a game is also shown somewhere else, or leave it unset.'} />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/30">About this section</span>
        </div>
        {session.signedIn && (
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
              showAddForm ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Add broadcaster {showAddForm ? '▴' : '▾'}
          </button>
        )}
      </div>
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to add or edit broadcasters.</p>}
      {session.signedIn && showAddForm && (
        <div className="flex flex-col gap-2">
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg bg-white/5 px-3 py-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New broadcaster name"
              className={`${inputClass} w-40`}
            />
            <input
              type="text"
              value={newLogoUrl}
              onChange={(e) => setNewLogoUrl(e.target.value)}
              placeholder="Logo image URL (optional)"
              className={`${inputClass} w-56`}
            />
            <button type="submit" className="rounded-md bg-[#1fd8c9] px-3 py-1.5 text-xs font-bold text-[#0f1e54] hover:brightness-95">
              Add
            </button>
          </form>
          {createError && <p className="text-xs text-red-300">{createError}</p>}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {broadcasters.map((b) => (
            <BroadcasterRow
              key={b.slug}
              broadcaster={b}
              session={session}
              saveBroadcaster={saveBroadcaster}
              onSetMain={handleSetMain}
              removeBroadcaster={removeBroadcaster}
            />
          ))}
        </div>
      )}
    </div>
  );
}
