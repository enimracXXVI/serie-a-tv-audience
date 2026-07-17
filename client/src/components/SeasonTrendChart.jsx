import { useRef, useState } from 'react';
import { niceTicks } from '../lib/chartTicks.js';
import { formatNumber, formatAbbreviated } from '../lib/formatNumber.js';

const WIDTH = 780;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 24, left: 40 };
const TOOLTIP_WIDTH = 132;

export default function SeasonTrendChart({ trend, team }) {
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const maxMatchday = trend.length ? trend[trend.length - 1].matchday : 1;
  const maxValue = Math.max(...trend.map((t) => Math.max(t.leagueAvg, t.teamValue ?? 0)), 1);
  const gridLines = niceTicks(maxValue);
  const yMax = gridLines[gridLines.length - 1];

  const xScale = (md) => PAD.left + ((md - 1) / Math.max(maxMatchday - 1, 1)) * (WIDTH - PAD.left - PAD.right);
  const yScale = (v) => HEIGHT - PAD.bottom - (v / yMax) * (HEIGHT - PAD.top - PAD.bottom);

  const leaguePoints = trend.map((t) => `${xScale(t.matchday)},${yScale(t.leagueAvg)}`).join(' ');
  const teamPoints = trend
    .filter((t) => t.teamValue !== null)
    .map((t) => `${xScale(t.matchday)},${yScale(t.teamValue)}`)
    .join(' ');

  // Pointer events unify mouse hover and touch tap/drag - finds the trend
  // point whose x position is nearest the pointer.
  function handlePointerActive(event) {
    const svg = svgRef.current;
    if (!svg || trend.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const svgX = ratio * WIDTH;
    let closest = 0;
    let closestDist = Infinity;
    trend.forEach((t, i) => {
      const dist = Math.abs(xScale(t.matchday) - svgX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHoverIdx(closest);
  }

  // On touch, lifting the finger fires pointerleave too - only a real mouse
  // leaving the chart should dismiss the tooltip, so a tap stays visible.
  function handlePointerLeave(event) {
    if (event.pointerType === 'mouse') setHoverIdx(null);
  }

  const hovered = hoverIdx !== null ? trend[hoverIdx] : null;
  const hoverX = hovered ? xScale(hovered.matchday) : null;
  const tooltipOnRight = hoverX !== null && hoverX < WIDTH - PAD.right - TOOLTIP_WIDTH - 8;
  const tooltipX = hoverX !== null ? (tooltipOnRight ? hoverX + 10 : hoverX - TOOLTIP_WIDTH - 10) : 0;
  const tooltipLines = hovered
    ? [
        `Matchday ${hovered.matchday}`,
        `League avg: ${formatNumber(hovered.leagueAvg)}`,
        ...(team && hovered.teamValue !== null ? [`${team.name}: ${formatNumber(hovered.teamValue)}`] : []),
      ]
    : [];
  const tooltipHeight = tooltipLines.length * 13 + 10;
  const tooltipY =
    hoverX !== null
      ? Math.max(PAD.top, Math.min(yScale(hovered.leagueAvg) - tooltipHeight / 2, HEIGHT - PAD.bottom - tooltipHeight))
      : 0;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#0f1e54]">Season audience trend</h3>
        <div className="flex items-center gap-3 text-[10px] font-semibold">
          <span className="flex items-center gap-1 text-gray-500">
            <span className="inline-block h-0.5 w-3 rounded-full bg-gray-400" /> League average
          </span>
          {team && (
            <span className="flex items-center gap-1" style={{ color: team.primary }}>
              <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: team.primary }} /> {team.name}
            </span>
          )}
        </div>
      </div>
      {trend.length === 0 ? (
        <p className="text-xs text-gray-400">No played games yet.</p>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          role="img"
          aria-label="Average audience per matchday across the season"
          onPointerDown={handlePointerActive}
          onPointerMove={handlePointerActive}
          onPointerLeave={handlePointerLeave}
        >
          {gridLines.map((v) => (
            <line key={v} x1={PAD.left} x2={WIDTH - PAD.right} y1={yScale(v)} y2={yScale(v)} stroke="#f1f5f9" strokeWidth={1} />
          ))}
          {gridLines.map((v) => (
            <text key={v} x={PAD.left - 6} y={yScale(v) + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
              {formatAbbreviated(v)}
            </text>
          ))}
          <polyline points={leaguePoints} fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {team && (
            <polyline
              points={teamPoints}
              fill="none"
              stroke={team.primary || '#1fd8c9'}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {hovered && (
            <>
              <line
                x1={hoverX}
                x2={hoverX}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="#0f1e54"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <circle cx={hoverX} cy={yScale(hovered.leagueAvg)} r={3.5} fill="#94a3b8" stroke="#fff" strokeWidth={1.5} />
              {team && hovered.teamValue !== null && (
                <circle cx={hoverX} cy={yScale(hovered.teamValue)} r={3.5} fill={team.primary || '#1fd8c9'} stroke="#fff" strokeWidth={1.5} />
              )}
              <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                <rect width={TOOLTIP_WIDTH} height={tooltipHeight} rx={6} fill="#0f1e54" opacity={0.95} />
                {tooltipLines.map((line, i) => (
                  <text key={i} x={10} y={16 + i * 13} fontSize="10" fontWeight={i === 0 ? 700 : 500} fill="#fff">
                    {line}
                  </text>
                ))}
              </g>
            </>
          )}
        </svg>
      )}
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-gray-400">
        <span>Matchday 1</span>
        <span>Matchday {maxMatchday}</span>
      </div>
    </div>
  );
}
