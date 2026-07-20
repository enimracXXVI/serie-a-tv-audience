import { useState } from 'react';
import { useAppSettings } from '../lib/useAppSettings.jsx';
import { callWithReauth } from '../lib/reauth.js';

const inputClass =
  'w-full rounded-md border border-white/20 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-[#1fd8c9] placeholder:text-white/30';

function LogoField({ value, session, onCommit }) {
  const [draft, setDraft] = useState(value ?? '');
  return (
    <input
      type="text"
      value={draft}
      disabled={!session.signedIn}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== (value ?? '')) onCommit(draft);
      }}
      placeholder="Serie A logo image URL"
      className={inputClass}
    />
  );
}

export default function AppSettingsPanel({ session }) {
  const { serieALogoUrl, loading, saveAppSettings } = useAppSettings();
  const [error, setError] = useState(null);

  async function commit(url) {
    setError(null);
    try {
      await callWithReauth(session, (token) => saveAppSettings({ serieALogoUrl: url }, token));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-white/40">Shown next to the title on the Fixtures and Standings page headers.</p>
      {!session.signedIn && <p className="text-xs text-white/50">Sign in to set the Serie A logo.</p>}
      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {serieALogoUrl && <img src={serieALogoUrl} alt="" className="h-6 max-w-[100px] object-contain" />}
            <LogoField value={serieALogoUrl} session={session} onCommit={commit} />
          </div>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </>
      )}
    </div>
  );
}
