import { formatNumber } from '../lib/formatNumber.js';
import Card from './Card.jsx';

function ComparisonRow({ title, seasons, pick }) {
  const values = seasons.map((s) => (s.loading || s.error ? null : pick(s)));
  const max = Math.max(1, ...values.filter((v) => v !== null && v !== undefined));

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-500">{title}</p>
      <div className="flex flex-col gap-1.5">
        {seasons.map((s, i) => {
          const value = values[i];
          return (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-xs font-bold text-gray-600">{s.label}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
                {value !== null && value !== undefined && (
                  <div
                    className="h-full rounded-full bg-[#1fd8c9]"
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                )}
              </div>
              <span className="w-20 shrink-0 text-right text-xs font-bold text-[#0f1e54]">
                {s.loading ? '…' : s.error ? 'n/a' : formatNumber(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SeasonComparisonCard({ seasons, focusedTeam }) {
  const anyError = seasons.some((s) => s.error);

  return (
    <Card title="Season comparison">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">League-wide, all clubs</p>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ComparisonRow title="Total audience" seasons={seasons} pick={(s) => s.totalAudience} />
        <ComparisonRow title="League avg home audience" seasons={seasons} pick={(s) => s.leagueAvg} />
      </div>

      {focusedTeam && (
        <>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">{focusedTeam.name}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ComparisonRow title="Home avg audience" seasons={seasons} pick={(s) => s.focusedAvg} />
            <ComparisonRow title="Total audience (home + away)" seasons={seasons} pick={(s) => s.focusedTotal} />
          </div>
        </>
      )}

      {anyError && (
        <p className="mt-3 text-[10px] text-gray-400">
          One or more archive seasons couldn&apos;t be loaded - check the Google Sheet tabs exist with the
          right headers (see README).
        </p>
      )}
    </Card>
  );
}
