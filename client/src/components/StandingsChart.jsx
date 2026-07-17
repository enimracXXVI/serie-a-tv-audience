import { useEffect, useMemo, useState } from 'react';
import Crest, { useCrestSrc } from './Crest.jsx';
import { computeStandings, computeStandingsHistory, computeRankHistory, maxPlayedMatchday } from '../lib/standings.js';

// Crest artwork isn't always square (the bundled placeholders are a taller
// shield shape, and a custom crestUrl could be anything) - fitting it into a
// same-size box via the nested <image>'s own preserveAspectRatio should be
// enough, but measuring the real image and sizing the box to match its
// actual aspect ratio (like CSS object-fit: contain) leaves nothing to
// chance and guarantees it's never stretched into an oval.
function useNaturalAspectRatio(src) {
  const [ratio, setRatio] = useState(null);
  useEffect(() => {
    setRatio(null);
    if (!src) return undefined;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled && img.naturalWidth && img.naturalHeight) {
        setRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return ratio;
}

const WIDTH = 780;
const PAD = { top: 16, right: 22, bottom: 26, left: 30 };
const CREST_SIZE = 15;
const MIN_GAP = CREST_SIZE + 2;
// Approximates RankedList's own rendered height (header + one row per club)
// so the chart fills the same vertical space instead of leaving the taller
// of the two columns padded out with blank canvas.
const RANKED_LIST_HEADER_HEIGHT = 16;
const RANKED_LIST_ROW_HEIGHT = 24;

function chartHeightFor(teamCount) {
  return Math.max(240, RANKED_LIST_HEADER_HEIGHT + teamCount * RANKED_LIST_ROW_HEIGHT);
}

// Nudges same-x endpoints apart vertically so their crests don't overlap,
// keeping each as close as possible to its true data position.
function spreadVertically(items, chartHeight) {
  const sorted = [...items].sort((a, b) => a.dataY - b.dataY);
  sorted.forEach((item) => {
    item.y = item.dataY;
  });
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < MIN_GAP) sorted[i].y = sorted[i - 1].y + MIN_GAP;
  }
  const bottom = chartHeight - PAD.bottom;
  const overflow = sorted[sorted.length - 1]?.y - bottom;
  if (overflow > 0) {
    for (let i = sorted.length - 1; i >= 0; i--) sorted[i].y -= overflow;
  }
  return sorted;
}

// A handful of evenly-spaced matchday numbers (always including 1 and the
// last matchday) for the x-axis - never one tick per matchday, which would
// crowd together the same way the old un-ticked axis looked blank.
function xAxisTicks(maxMatchday) {
  if (maxMatchday <= 1) return [1];
  const step = maxMatchday <= 10 ? 1 : maxMatchday <= 20 ? 2 : maxMatchday <= 40 ? 5 : 10;
  const ticks = [];
  for (let md = 1; md <= maxMatchday; md += step) ticks.push(md);
  if (ticks[ticks.length - 1] !== maxMatchday) ticks.push(maxMatchday);
  return ticks;
}

function CrestMarker({ team, x, y, dataY, size, dimmed, isHovered, setHoveredSlug }) {
  const { src, onError } = useCrestSrc(team);
  const ratio = useNaturalAspectRatio(src);
  const showConnector = Math.abs(y - dataY) > 1;

  let w = size;
  let h = size;
  if (ratio) {
    if (ratio >= 1) h = size / ratio;
    else w = size * ratio;
  }

  // Mouse hover highlights instantly; a tap (no hover on touch) toggles the
  // same highlight so mobile gets an equivalent interaction.
  function toggle() {
    setHoveredSlug(isHovered ? null : team.slug);
  }

  return (
    <g
      opacity={dimmed ? 0.25 : 1}
      onMouseEnter={() => setHoveredSlug(team.slug)}
      onMouseLeave={() => setHoveredSlug(null)}
      onClick={toggle}
      style={{ cursor: 'pointer' }}
    >
      {showConnector && <line x1={x} y1={dataY} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />}
      {/* Generous invisible hit area - the crest itself is small, this makes it easy to hover/tap precisely */}
      <circle cx={x} cy={y} r={size / 2 + 4} fill="transparent" />
      <image
        href={src}
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        onError={onError}
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  );
}

function LineChart({ chartHeight, cutoff, maxMatchday, series, gridLines, yScale, formatGridLabel, hoveredSlug, setHoveredSlug }) {
  const markers = useMemo(() => {
    const items = series.map((s) => ({ slug: s.team.slug, team: s.team, dataY: yScale(s.lastValue) }));
    return spreadVertically(items, chartHeight);
  }, [series, yScale, chartHeight]);

  const xScale = (md) => PAD.left + (md / maxMatchday) * (WIDTH - PAD.left - PAD.right);
  const ticks = useMemo(() => xAxisTicks(maxMatchday), [maxMatchday]);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${chartHeight}`}
      className="w-full"
      style={{ height: 'auto' }}
      role="img"
      aria-label="Standing by matchday"
    >
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
          isHovered={m.slug === hoveredSlug}
          setHoveredSlug={setHoveredSlug}
        />
      ))}

      {ticks.map((md) => (
        <text key={md} x={xScale(md)} y={chartHeight - PAD.bottom + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">
          {md}
        </text>
      ))}
    </svg>
  );
}

function RankedList({ ranked, cutoff, valueKey, hoveredSlug, setHoveredSlug }) {
  return (
    <div className="lg:w-56">
      <h4 className="mb-2 text-xs font-bold text-gray-400">Order at matchday {cutoff}</h4>
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
            <span className="font-bold text-[#0f1e54]">{valueKey === 'points' ? row.points : i + 1}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StandingSection({ title, metric, fixtures, teams, teamCount, maxMatchday, defaultCutoff, history }) {
  const [cutoff, setCutoff] = useState(defaultCutoff);
  const [hoveredSlug, setHoveredSlug] = useState(null);
  const chartHeight = chartHeightFor(teamCount);

  const ranked = useMemo(() => computeStandings(fixtures, teams, cutoff), [fixtures, teams, cutoff]);

  const maxPoints = useMemo(() => {
    if (metric !== 'points') return 0;
    let max = 3;
    for (const h of history) {
      for (const slug in h.points) max = Math.max(max, h.points[slug]);
    }
    return Math.ceil((max + 3) / 5) * 5;
  }, [history, metric]);

  const series = useMemo(() => {
    if (metric === 'points') {
      return teams.map((team) => {
        const points = [{ matchday: 0, value: 0 }];
        for (const h of history) {
          if (h.matchday > cutoff) break;
          points.push({ matchday: h.matchday, value: h.points[team.slug] ?? 0 });
        }
        return { team, points, lastValue: points[points.length - 1].value };
      });
    }
    return teams.map((team) => {
      const points = [];
      for (const h of history) {
        if (h.matchday > cutoff) break;
        points.push({ matchday: h.matchday, value: h.ranks[team.slug] ?? teamCount });
      }
      if (points.length === 0) points.push({ matchday: cutoff, value: teamCount });
      return { team, points, lastValue: points[points.length - 1].value };
    });
  }, [teams, history, cutoff, teamCount, metric]);

  const yScale =
    metric === 'points'
      ? (pts) => chartHeight - PAD.bottom - (pts / maxPoints) * (chartHeight - PAD.top - PAD.bottom)
      : (rank) => PAD.top + ((rank - 1) / Math.max(teamCount - 1, 1)) * (chartHeight - PAD.top - PAD.bottom);

  const gridLines =
    metric === 'points'
      ? Array.from({ length: Math.floor(maxPoints / 10) + 1 }, (_, i) => i * 10)
      : [...new Set([1, Math.round(teamCount / 4), Math.round(teamCount / 2), Math.round((3 * teamCount) / 4), teamCount])];

  const formatGridLabel = metric === 'points' ? (p) => p : (r) => `${r}${r === 1 ? 'st' : ''}`;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0f1e54]">{title}</h3>
        <span className="text-xs font-semibold text-gray-400">Matchday {cutoff}</span>
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-3">
          <LineChart
            chartHeight={chartHeight}
            cutoff={cutoff}
            maxMatchday={maxMatchday}
            series={series}
            gridLines={gridLines}
            yScale={yScale}
            formatGridLabel={formatGridLabel}
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
        <RankedList ranked={ranked} cutoff={cutoff} valueKey={metric} hoveredSlug={hoveredSlug} setHoveredSlug={setHoveredSlug} />
      </div>
    </div>
  );
}

export default function StandingsChart({ fixtures, teams }) {
  const matchdays = useMemo(() => [...new Set(fixtures.map((f) => f.matchday))].sort((a, b) => a - b), [fixtures]);
  const maxMatchday = matchdays[matchdays.length - 1] ?? 1;
  const pointsHistory = useMemo(() => computeStandingsHistory(fixtures, teams), [fixtures, teams]);
  const rankHistory = useMemo(() => computeRankHistory(fixtures, teams), [fixtures, teams]);
  const defaultCutoff = useMemo(() => maxPlayedMatchday(fixtures) || 1, [fixtures]);
  const teamCount = teams.length || 1;

  return (
    <div className="flex flex-col gap-6">
      <StandingSection
        title="Standing by matchday - position"
        metric="position"
        fixtures={fixtures}
        teams={teams}
        teamCount={teamCount}
        maxMatchday={maxMatchday}
        defaultCutoff={defaultCutoff}
        history={rankHistory}
      />
      <StandingSection
        title="Standing by matchday - points"
        metric="points"
        fixtures={fixtures}
        teams={teams}
        teamCount={teamCount}
        maxMatchday={maxMatchday}
        defaultCutoff={defaultCutoff}
        history={pointsHistory}
      />
    </div>
  );
}
