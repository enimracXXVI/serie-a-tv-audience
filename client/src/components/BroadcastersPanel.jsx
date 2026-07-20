import { useState } from 'react';
import { useCupData } from '../lib/useCupData.jsx';
import { callWithReauth } from '../lib/reauth.js';

const inputClass =
  'rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

function BroadcasterRow({ broadcaster, session, saveBroadcaster }) {
  const [logoUrl, setLogoUrl] = useState(broadcaster.logoUrl ?? '');
  const [error, setError] = useState(null);

  async function commit() {
    if (logoUrl === (broadcaster.logoUrl ?? '')) return;
    setError(null);
    try {
      await callWithReauth(session, (token) => saveBroadcaster(broadcaster.name, { logoUrl }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2">
        {broadcaster.logoUrl && <img src={broadcaster.logoUrl} alt="" className="h-4 max-w-[60px] object-contain" />}
        <span className="text-sm font-semibold text-white">{broadcaster.name}</span>
      </div>
      <input
        type="text"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        onBlur={commit}
        placeholder="Logo image URL"
        className={`${inputClass} w-full`}
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

export default function BroadcastersPanel({ session }) {
  const { broadcasters, loading, error, saveBroadcaster, createBroadcaster } = useCupData();
  const [newName, setNewName] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [createError, setCreateError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) {
      setCreateError('Enter a broadcaster name.');
      return;
    }
    try {
      await callWithReauth(session, (token) =>
        createBroadcaster({ name: newName.trim(), logoUrl: newLogoUrl.trim() }, token)
      );
      setNewName('');
      setNewLogoUrl('');
    } catch (err) {
      setCreateError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">Broadcasters</h2>
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to add or edit broadcasters.</p>}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {broadcasters.map((b) => (
            <BroadcasterRow key={b.name} broadcaster={b} session={session} saveBroadcaster={saveBroadcaster} />
          ))}
          {session.signedIn && (
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
          {createError && <p className="text-xs text-red-300">{createError}</p>}
        </div>
      )}
    </div>
  );
}
