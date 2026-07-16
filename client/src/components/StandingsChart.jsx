import { useMemo, useState } from 'react';
import Crest from './Crest.jsx';
import { computeStandings, computeStandingsHistory, maxPlayedMatchday } from '../lib/standings.js';

const WIDTH = 780;
const HEIGHT = 380;
const PAD = { top: 16, right: 40, bottom: 28, left: 30 };
const MIN_LABEL_GAP = 15;

function layoutLabels(items) {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < MIN_LABEL_GAP) sorted[i].y = sorted[i - 1].y + MIN_LABEL_GAP;
  }
  const bottom = HEIGHT - PAD.bottom;
  const overflow = sorted[sorted.length - 1]?.y - bottom;
  if (overflow > 0) {
    for (let i = sorted.length - 1; i >= 0; i--) sorted[i].y -= overflow;
  }
  return sorted;
}

export default function StandingsChart({ fixtures, teams }) {
  const matchdays = useMemo(() => [...new Set(fixtures.map((f) => f.matchday))].sort((a, b) => a - b), [fixtures]);
  const maxMatchday = matchdays[matchdays.length - 1] ?? 1;
  const history = useMemo(() => computeStandingsHistory(fixtures, teams), [fixtures, teams]);
  const defaultCutoff = useMemo(() => maxPlayedMatchday(fixtures) || 1, [fixtures]);
  const [cutoff, setCutoff] = useState(defaultCutoff);
  const [hoveredSlug, setHoveredSlug] = useState(null);

  const ranked = useMemo(() => computeStandings(fixtures, teams, cutoff), [fixtures, teams, cutoff]);

  const maxPoints = useMemo(() => {
    let max = 3;
    for (const h of history) {
      for (const slug in h.points) max = Math.max(max, h.points[slug]);
    }
    return Math.ceil((max + 3) / 5) * 5;
  }, [history]);

  const xScale = (md) => PAD.left + (md / maxMatchday) * (WIDTH - PAD.left - PAD.right);
  const yScale = (pts) => HEIGHT - PAD.bottom - (pts / maxPoints) * (HEIGHT - PAD.top - PAD.bottom);

  const series = useMemo(() => {
    return teams.map((team) => {
      const points = [{ matchday: 0, points: 0 }];
      for (const h of history) {
        if (h.matchday > cutoff) break;
        points.push({ matchday: h.matchday, points: h.points[team.slug] ?? 0 });
      }
      const last = points[points.length - 1];
      return { team, points, last };
    });
  }, [teams, history, cutoff]);

  const labelSeries = useMemo(() => {
    const candidates = series.filter((s) => s.team.sponsored || s.team.slug === hoveredSlug);
    const leader = [...series].sort((a, b) => b.last.points - a.last.points)[0];
    if (leader && !candidates.includes(leader)) candidates.push(leader);
    const toY = (pts) => HEIGHT - PAD.bottom - (pts / maxPoints) * (HEIGHT - PAD.top - PAD.bottom);
    const items = candidates.map((s) => {
      const dataY = toY(s.last.points);
      return { slug: s.team.slug, team: s.team, dataY, y: dataY };
    });
    return layoutLabels(items);
  }, [series, hoveredSlug, maxPoints]);

  const gridLines = [];
  for (let p = 0; p <= maxPoints; p += 10) gridLines.push(p);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-lg shadow-black/20 lg:flex-row">
      <div className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0f1e54]">Standing by matchday</h3>
          <span className="text-xs font-semibold text-gray-400">Matchday {cutoff}</span>
        </div>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Points by matchday, per club">
          {gridLines.map((p) => (
            <line
              key={p}
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yScale(p)}
              y2={yScale(p)}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
          ))}
          {gridLines.map((p) => (
            <text key={p} x={PAD.left - 6} y={yScale(p) + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
              {p}
            </text>
          ))}

          {series.map(({ team, points }) => {
            const isDim = hoveredSlug && hoveredSlug !== team.slug;
            return (
              <polyline
                key={team.slug}
                points={points.map((p) => `${xScale(p.matchday)},${yScale(p.points)}`).join(' ')}
                fill="none"
                stroke={team.primary || '#94a3b8'}
                strokeWidth={team.slug === hoveredSlug ? 3 : team.sponsored ? 2.5 : 1.5}
                strokeOpacity={isDim ? 0.15 : team.sponsored || hoveredSlug === team.slug ? 1 : 0.45}
                strokeLinejoin="round"
                strokeLinecap="round"
                onMouseEnter={() => setHoveredSlug(team.slug)}
                onMouseLeave={() => setHoveredSlug(null)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}

          {series.map(({ team, last }) => (
            <circle
              key={team.slug}
              cx={xScale(last.matchday)}
              cy={yScale(last.points)}
              r={team.slug === hoveredSlug ? 4 : 2.5}
              fill={team.primary || '#94a3b8'}
              opacity={hoveredSlug && hoveredSlug !== team.slug ? 0.2 : 1}
            />
          ))}

          {labelSeries.map((item) => (
            <g key={item.slug}>
              <line
                x1={xScale(cutoff) + 3}
                x2={WIDTH - PAD.right + 2}
                y1={item.dataY}
                y2={item.y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text x={WIDTH - PAD.right + 5} y={item.y + 3} fontSize="9" fontWeight="700" fill="#0f1e54">
                {item.team.short ?? item.team.name}
              </text>
            </g>
          ))}

          <line
            x1={xScale(cutoff)}
            x2={xScale(cutoff)}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            stroke="#1fd8c9"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        </svg>
        <input
          type="range"
          min={1}
          max={maxMatchday}
          value={cutoff}
          onChange={(e) => setCutoff(Number(e.target.value))}
          className="mt-2 w-full accent-[#1fd8c9]"
        />
        <div className="flex justify-between text-[10px] font-semibold text-gray-400">
          <span>Matchday 1</span>
          <span>Matchday {maxMatchday}</span>
        </div>
      </div>

      <div className="lg:w-56">
        <h3 className="mb-2 text-sm font-bold text-[#0f1e54]">Order at matchday {cutoff}</h3>
        <ol className="flex flex-col gap-1">
          {ranked.map((row, i) => (
            <li
              key={row.slug}
              onMouseEnter={() => setHoveredSlug(row.slug)}
              onMouseLeave={() => setHoveredSlug(null)}
              className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors ${
                row.slug === hoveredSlug ? 'bg-[#1fd8c9]/10' : ''
              }`}
            >
              <span className="w-4 shrink-0 text-right font-bold text-gray-400">{i + 1}</span>
              <Crest team={row.team} size={16} />
              <span className={`flex-1 truncate ${row.team.sponsored ? 'font-bold text-[#0f1e54]' : 'text-gray-600'}`}>
                {row.team.name}
              </span>
              <span className="font-bold text-[#0f1e54]">{row.points}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
