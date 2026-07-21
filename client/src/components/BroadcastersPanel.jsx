import { useState } from 'react';
import { useCupData } from '../lib/useCupData.jsx';
import { callWithReauth } from '../lib/reauth.js';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function BroadcasterRow({ broadcaster, session, saveBroadcaster, onSetMain }) {
  const [logoUrl, setLogoUrl] = useState(broadcaster.logoUrl ?? '');
  const [error, setError] = useState(null);

  async function commit() {
    if (logoUrl === (broadcaster.logoUrl ?? '')) return;
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

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2">
        {broadcaster.logoUrl && <img src={broadcaster.logoUrl} alt="" className="h-4 max-w-[60px] object-contain" />}
        <span className="text-sm font-semibold text-white">{broadcaster.name}</span>
        {broadcaster.isMain && (
          <span className="rounded-full bg-[#1fd8c9]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#1fd8c9]">
            Main
          </span>
        )}
      </div>
      <input
        type="text"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        onBlur={commit}
        placeholder="Logo image URL"
        className={`${inputClass} w-full`}
      />
      {session.signedIn && !broadcaster.isMain && (
        <button onClick={setMain} className="self-start text-[10px] font-semibold text-white/50 hover:text-white">
          Set as main broadcaster
        </button>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

export default function BroadcastersPanel({ session }) {
  const { broadcasters, loading, error, saveBroadcaster, createBroadcaster } = useCupData();
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
      <p className="text-xs text-white/40">
        Mark exactly one broadcaster as <strong>main</strong> (e.g. DAZN) - its name/logo replaces every hardcoded
        "DAZN" label on the Serie A calendar and Dashboard. Every other broadcaster here (e.g. Sky Sport) becomes a
        per-fixture "other broadcaster" choice - pick one when a game is also shown somewhere else, or leave it unset.
      </p>
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to add or edit broadcasters.</p>}
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
            />
          ))}
          {session.signedIn && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className={`self-start rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  showAddForm ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Add broadcaster {showAddForm ? '▴' : '▾'}
              </button>
              {showAddForm && (
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
              )}
            </div>
          )}
          {createError && <p className="text-xs text-red-300">{createError}</p>}
        </div>
      )}
    </div>
  );
}
