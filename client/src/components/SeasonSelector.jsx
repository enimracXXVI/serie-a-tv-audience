import { useSeasons } from '../lib/useSeasons.jsx';
import Dropdown from './Dropdown.jsx';

export default function SeasonSelector({ season, onChange }) {
  const { seasons } = useSeasons();
  return (
    <Dropdown
      variant="header"
      value={season.label}
      onChange={(label) => onChange(seasons.find((s) => s.label === label) ?? seasons[0])}
      options={seasons.map((s) => ({ value: s.label, label: s.label }))}
    />
  );
}
