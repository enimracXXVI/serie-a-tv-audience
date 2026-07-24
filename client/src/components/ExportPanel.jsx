import { useState } from 'react';
import Dropdown from './Dropdown.jsx';
import { useSeasons } from '../lib/useSeasons.jsx';
import { exportFixturesCsv } from '../lib/exportCsv.js';

const KINDS = [
  { key: 'serie-a', label: 'Serie A fixtures' },
  { key: 'cup', label: 'Cup fixtures' },
  { key: 'all', label: 'All fixtures' },
];

export default function ExportPanel() {
  const { seasons, currentSeason } = useSeasons();
  const [seasonLabel, setSeasonLabel] = useState(currentSeason?.label ?? '');
  const [busyKind, setBusyKind] = useState(null);
  const [error, setError] = useState(null);

  const season = seasons.find((s) => s.label === seasonLabel) ?? currentSeason;

  async function handleExport(kind) {
    if (!season || busyKind) return;
    setBusyKind(kind);
    setError(null);
    try {
      await exportFixturesCsv({ season, kind });
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/50">
        Download fixtures for a season as a CSV file - clubs and competitions are resolved to their full names.
      </p>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Season</span>
        <Dropdown
          variant="sidebar"
          value={season?.label ?? ''}
          onChange={setSeasonLabel}
          options={seasons.map((s) => ({ value: s.label, label: s.label }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => handleExport(k.key)}
            disabled={busyKind !== null || !season}
            className="rounded-md bg-white/10 px-3 py-2.5 text-left text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyKind === k.key ? 'Preparing…' : `Download ${k.label} (.csv)`}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
