import { useState } from 'react';

function AccountIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function SignInBar({ session, tone = 'dark' }) {
  const [open, setOpen] = useState(false);
  const isLight = tone === 'light';
  const ringClass = isLight ? 'border-black/30 text-black hover:bg-black/10' : 'border-white/40 text-white hover:bg-white/10';

  if (session.loading) return <div className="h-9 w-9" />;

  if (!session.signedIn) {
    return (
      <button
        onClick={session.signIn}
        title="Sign in with Google to edit"
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${ringClass}`}
      >
        <AccountIcon />
      </button>
    );
  }

  const initial = session.login ? session.login[0].toUpperCase() : '?';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={session.login}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1fd8c9] text-sm font-bold text-[#0f1e54] transition-transform hover:scale-105"
      >
        {initial}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
            <p className="truncate text-xs text-gray-500">Signed in as</p>
            <p className="truncate text-sm font-semibold text-[#0f1e54]">{session.login}</p>
            <button
              onClick={() => {
                session.signOut();
                setOpen(false);
              }}
              className="mt-2 w-full rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
