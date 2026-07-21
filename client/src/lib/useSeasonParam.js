import { useSearchParams } from 'react-router-dom';
import { SEASONS, CURRENT_SEASON } from './seasons.js';

// Shared season URL param ('?season=25/26') for every page with a season
// selector, so a bookmarked or shared link reopens on the same season
// instead of always resetting to the current one. The current season is
// the default and never written to the URL, so a plain page link stays
// clean. Changing season also clears 'matchday' (used by Fixtures/Standings
// to persist which matchday's being viewed) since a matchday number from
// one season has no guaranteed meaning in another.
export function useSeasonParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const label = searchParams.get('season');
  const season = (label && SEASONS.find((s) => s.label === label)) || CURRENT_SEASON;

  function setSeason(next) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next.label === CURRENT_SEASON.label) params.delete('season');
        else params.set('season', next.label);
        params.delete('matchday');
        return params;
      },
      { replace: true }
    );
  }

  return [season, setSeason];
}
