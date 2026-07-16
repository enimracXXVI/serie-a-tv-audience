import { useMemo, useState } from 'react';
import Crest, { useCrestSrc } from './Crest.jsx';
import { computeStandings, computeStandingsHistory, computeRankHistory, maxPlayedMatchday } from '../lib/standings.js';

const WIDTH = 780;
const CHART_HEIGHT = 460;
const PAD = { top: 16, right: 22, bottom: 28, left: 30 };
const CREST_SIZE = 15;
const MIN_GAP = CREST_SIZE + 2;

// Nudges same-x endpoints apart vertically so their crests don't overlap,
// keeping each as close as possible to its true data position.
function spreadVertically(items) {
  const sorted = [...items].sort((a, b) => a.dataY - b.dataY);
  sorted.forEach((item) => {
    item.y = item.dataY;
  });
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < MIN_GAP) sorted[i].y = sorted[i - 1].y + MIN_GAP;
  }
  const bottom = CHART_HEIGHT - PAD.bottom;
  const overflow = sorted[sorted.length - 1]?.y - bottom;
  if (overflow > 0) {
    for (let i = sorted.length - 1; i >= 0; i--) sorted[i].y -= overflow;
  }
  return sorted;
}

function CrestMarker({ team, x, y, dataY, size, dimmed }) {
  const { src, onError } = useCrestSrc(team);
  const showConnector = Math.abs(y - dataY) > 1;
  return (
    <g opacity={dimmed ? 0.25 : 1}>
      {showConnector && <line x1={x} y1={dataY} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />}
      <image
        href={src}
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        onError={onError}
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  );
}

function LineChart({ title, cutoff, maxMatchday, series, gridLines, yScale, formatGridLabel, hoveredSlug, setHoveredSlug }) {
  const markers = useMemo(() => {
    const items = series.map((s) => ({ slug: s.team.slug, team: s.team, dataY: yScale(s.lastValue) }));
    return spreadVertically(items);
  }, [series, yScale]);

  const xScale = (md) => PAD.left + (md / maxMatchday) * (WIDTH - PAD.left - PAD.right);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0f1e54]">{title}</h3>
        <span className="text-xs font-semibold text-gray-400">Matchday {cutoff}</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${CHART_HEIGHT}`} className="w-full" role="img" aria-label={title}>
        {gridLines.map((g) => (
          <line key={g} x1={PAD.left} x2={WIDTH - PAD.right} y1={yScale(g)} y2={yScale(g)} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        {gridLines.map((g) => (
          <text key={g} x={PAD.left - 6} y={yScale(g) + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
            {formatGridLabel(g)}
          </text>
        ))}

        {series.map(({ team, points }) => {
          const isDim = hoveredSlug && hoveredSlug !== team.slug;
          return (
            <polyline
              key={team.slug}
              points={points.map((p) => `${xScale(p.matchday)},${yScale(p.value)}`).join(' ')}
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

        {markers.map((m) => (
          <CrestMarker
            key={m.slug}
            team={m.team}
            x={xScale(cutoff)}
            y={m.y}
            dataY={m.dataY}
            size={m.slug === hoveredSlug ? CREST_SIZE + 5 : CREST_SIZE}
            dimmed={hoveredSlug && hoveredSlug !== m.slug}
          />
        ))}

        <line
          x1={xScale(cutoff)}
          x2={xScale(cutoff)}
          y1={PAD.top}
          y2={CHART_HEIGHT - PAD.bottom}
          stroke="#1fd8c9"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      </svg>
    </div>
  );
}

export default function StandingsChart({ fixtures, teams }) {
  const matchdays = useMemo(() => [...new Set(fixtures.map((f) => f.matchday))].sort((a, b) => a - b), [fixtures]);
  const maxMatchday = matchdays[matchdays.length - 1] ?? 1;
  const pointsHistory = useMemo(() => computeStandingsHistory(fixtures, teams), [fixtures, teams]);
  const rankHistory = useMemo(() => computeRankHistory(fixtures, teams), [fixtures, teams]);
  const defaultCutoff = useMemo(() => maxPlayedMatchday(fixtures) || 1, [fixtures]);
  const [cutoff, setCutoff] = useState(defaultCutoff);
  const [hoveredSlug, setHoveredSlug] = useState(null);

  const ranked = useMemo(() => computeStandings(fixtures, teams, cutoff), [fixtures, teams, cutoff]);
  const teamCount = teams.length || 1;

  const maxPoints = useMemo(() => {
    let max = 3;
    for (const h of pointsHistory) {
      for (const slug in h.points) max = Math.max(max, h.points[slug]);
    }
    return Math.ceil((max + 3) / 5) * 5;
  }, [pointsHistory]);

  const pointsSeries = useMemo(() => {
    return teams.map((team) => {
      const points = [{ matchday: 0, value: 0 }];
      for (const h of pointsHistory) {
        if (h.matchday > cutoff) break;
        points.push({ matchday: h.matchday, value: h.points[team.slug] ?? 0 });
      }
      return { team, points, lastValue: points[points.length - 1].value };
    });
  }, [teams, pointsHistory, cutoff]);

  const positionSeries = useMemo(() => {
    return teams.map((team) => {
      const points = [];
      for (const h of rankHistory) {
        if (h.matchday > cutoff) break;
        points.push({ matchday: h.matchday, value: h.ranks[team.slug] ?? teamCount });
      }
      if (points.length === 0) points.push({ matchday: cutoff, value: teamCount });
      return { team, points, lastValue: points[points.length - 1].value };
    });
  }, [teams, rankHistory, cutoff, teamCount]);

  const pointsYScale = (pts) => CHART_HEIGHT - PAD.bottom - (pts / maxPoints) * (CHART_HEIGHT - PAD.top - PAD.bottom);
  const positionYScale = (rank) =>
    PAD.top + ((rank - 1) / Math.max(teamCount - 1, 1)) * (CHART_HEIGHT - PAD.top - PAD.bottom);

  const pointsGridLines = [];
  for (let p = 0; p <= maxPoints; p += 10) pointsGridLines.push(p);
  const positionGridLines = [...new Set([1, Math.round(teamCount / 4), Math.round(teamCount / 2), Math.round((3 * teamCount) / 4), teamCount])];

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-lg shadow-black/20 lg:flex-row">
      <div className="flex flex-1 flex-col gap-8">
        <LineChart
          title="Standing by matchday - points"
          cutoff={cutoff}
          maxMatchday={maxMatchday}
          series={pointsSeries}
          gridLines={pointsGridLines}
          yScale={pointsYScale}
          formatGridLabel={(p) => p}
          hoveredSlug={hoveredSlug}
          setHoveredSlug={setHoveredSlug}
        />
        <LineChart
          title="Standing by matchday - position"
          cutoff={cutoff}
          maxMatchday={maxMatchday}
          series={positionSeries}
          gridLines={positionGridLines}
          yScale={positionYScale}
          formatGridLabel={(r) => `${r}${r === 1 ? 'st' : ''}`}
          hoveredSlug={hoveredSlug}
          setHoveredSlug={setHoveredSlug}
        />

        <div>
          <input
            type="range"
            min={1}
            max={maxMatchday}
            value={cutoff}
            onChange={(e) => setCutoff(Number(e.target.value))}
            className="w-full accent-[#1fd8c9]"
          />
          <div className="flex justify-between text-[10px] font-semibold text-gray-400">
            <span>Matchday 1</span>
            <span>Matchday {maxMatchday}</span>
          </div>
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
