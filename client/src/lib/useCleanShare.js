import { useSearchParams } from 'react-router-dom';

// '?clean=1' hides sponsor dots/badges on every fixture row (see FixtureRow's
// `clean` prop) - shared via the URL (rather than private component state)
// so the "Clean share" toggle (in the page's own nav row) and CalendarView
// (which actually renders the fixture rows, lower on the page) always agree
// on what's currently showing.
export function useCleanShare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clean = searchParams.get('clean') === '1';

  function toggleClean() {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (params.get('clean') === '1') params.delete('clean');
        else params.set('clean', '1');
        return params;
      },
      { replace: true }
    );
  }

  return { clean, toggleClean };
}
