import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
import SimulcastBadge from './SimulcastBadge.jsx';
import ToggleSwitch from './ToggleSwitch.jsx';
import Card from './Card.jsx';
import Dropdown from './Dropdown.jsx';
import { computeTopGames } from '../lib/dashboardMetrics.js';
import { formatNumber } from '../lib/formatNumber.js';

const LIMITS = [5, 10, 20];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function TopGamesList({ fixtures, teams, simulcastInfo, includeSimulcast, includeOther, focusedSlug }) {
  const [limit, setLimit] = useState(10);
  const [teamFilter, setTeamFilter] = useState('');
  const [homeOnly, setHomeOnly] = useState(false);

  const effectiveTeamFilter = teamFilter || focusedSlug || '';

  const topGames = useMemo(
    () =>
      computeTopGames(fixtures, simulcastInfo, includeSimulcast, includeOther, {
        teamSlug: effectiveTeamFilter || undefined,
        homeOnly,
        limit,
      }),
    [fixtures, simulcastInfo, includeSimulcast, includeOther, effectiveTeamFilter, homeOnly, limit]
  );

  return (
    <Card
      title="Top games by audience"
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown
            variant="header"
            value={teamFilter}
            onChange={setTeamFilter}
            options={[
              { value: '', label: focusedSlug ? `${teams.find((t) => t.slug === focusedSlug)?.name ?? 'Focused club'} (selected)` : 'All clubs' },
              ...teams.map((t) => ({ value: t.slug, label: t.name })),
            ]}
          />
          <ToggleSwitch checked={homeOnly} onChange={setHomeOnly} label="Home only" labelClassName="text-[#0f1e54]/70" />
          <div className="flex gap-1">
            {LIMITS.map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  limit === n ? 'bg-white text-[#0f1e54]' : 'bg-black/10 text-[#0f1e54]/70 hover:bg-black/20'
                }`}
              >
                Top {n}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {topGames.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-400">No played games match these filters.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-gray-50">
          {topGames.map(({ fixture, audience }, i) => (
            <li key={fixture.id} className="flex items-center gap-2 py-2 text-sm">
              <span className="w-5 shrink-0 text-right text-xs font-bold text-gray-400">{i + 1}</span>
              <div className="flex w-20 shrink-0 flex-col items-center text-center text-[10px] leading-tight text-gray-400">
                <span className="font-bold text-gray-500">MD{fixture.matchday}</span>
                <span className="whitespace-nowrap">{formatDate(fixture.date)}</span>
                <span className="whitespace-nowrap">
                  {fixture.day} {fixture.kickoffTime}
                </span>
              </div>
              <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1.5 min-w-0">
                <div className="flex items-center justify-end gap-1.5 min-w-0">
                  {fixture.home.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
                  <span className="truncate text-xs font-semibold text-gray-700">{fixture.home.short ?? fixture.home.name}</span>
                  <Crest team={fixture.home} size={18} />
                </div>
                <span className="px-1 text-[10px] text-gray-300">vs</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Crest team={fixture.away} size={18} />
                  <span className="truncate text-xs font-semibold text-gray-700">{fixture.away.short ?? fixture.away.name}</span>
                  {fixture.away.sponsored && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1fd8c9]" />}
                </div>
              </div>
              <SimulcastBadge fixture={fixture} simulcastInfo={simulcastInfo} />
              <span className="w-16 shrink-0 text-right text-sm font-black text-[#0f1e54]">{formatNumber(audience)}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
