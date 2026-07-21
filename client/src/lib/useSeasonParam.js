import { useSearchParams } from 'react-router-dom';
import { useSeasons } from './useSeasons.jsx';

// Shared season URL param ('?season=25/26') for every page with a season
// selector, so a bookmarked or shared link reopens on the same season
// instead of always resetting to the current one. The current season is
// the default and never written to the URL, so a plain page link stays
// clean. Changing season also clears 'matchday' (used by Fixtures/Standings
// to persist which matchday's being viewed) since a matchday number from
// one season has no guaranteed meaning in another.
export function useSeasonParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { seasons, currentSeason } = useSeasons();
  const label = searchParams.get('season');
  const season = (label && seasons.find((s) => s.label === label)) || currentSeason;

  function setSeason(next) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next.label === currentSeason.label) params.delete('season');
        else params.set('season', next.label);
        params.delete('matchday');
        return params;
      },
      { replace: true }
    );
  }

  return [season, setSeason];
}
