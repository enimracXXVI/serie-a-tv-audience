import { useSearchParams } from 'react-router-dom';
import { useSeasons } from './useSeasons.jsx';

// Shared season URL param ('?season=25-26') for every page with a season
// selector, so a bookmarked or shared link reopens on the same season
// instead of always resetting to the current one. Uses the season's `slug`
// (e.g. "25-26") rather than its display `label` ("25/26") - a `/` in a
// query value works but isn't a clean, plain-text URL, so the sheet's own
// URL-safe slug column is what actually goes in the address bar. The
// current season is the default and never written to the URL, so a plain
// page link stays clean. Changing season also clears 'matchday' (used by
// Fixtures/Standings to persist which matchday's being viewed) since a
// matchday number from one season has no guaranteed meaning in another.
export function useSeasonParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { seasons, currentSeason } = useSeasons();
  const slug = searchParams.get('season');
  const season = (slug && seasons.find((s) => s.slug === slug)) || currentSeason;

  function setSeason(next) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next.label === currentSeason.label) params.delete('season');
        else params.set('season', next.slug);
        params.delete('matchday');
        return params;
      },
      { replace: true }
    );
  }

  return [season, setSeason];
}
