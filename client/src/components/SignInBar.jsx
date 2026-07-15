export default function SignInBar({ session, tone = 'dark' }) {
  const textClass = tone === 'light' ? 'text-black/70' : 'text-white/70';
  const btnClass =
    tone === 'light'
      ? 'bg-black/10 hover:bg-black/20 text-black'
      : 'bg-white/10 hover:bg-white/20 text-white';

  if (session.loading) return <div className="h-7" />;

  if (!session.signedIn) {
    return (
      <button
        onClick={session.signIn}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${btnClass}`}
      >
        <GitHubMark /> Sign in to edit
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs ${textClass}`}>
        Signed in as <span className="font-semibold">{session.login}</span>
      </span>
      <button
        onClick={session.signOut}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${btnClass}`}
      >
        Sign out
      </button>
    </div>
  );
}

function GitHubMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
