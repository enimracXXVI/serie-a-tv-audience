const WIDTH = 780;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 24, left: 34 };

export default function SeasonTrendChart({ trend, team }) {
  const maxMatchday = trend.length ? trend[trend.length - 1].matchday : 1;
  const maxValue = Math.max(...trend.map((t) => Math.max(t.leagueAvg, t.teamValue ?? 0)), 1);
  const yMax = Math.ceil((maxValue + 1) / 2) * 2;

  const xScale = (md) => PAD.left + ((md - 1) / Math.max(maxMatchday - 1, 1)) * (WIDTH - PAD.left - PAD.right);
  const yScale = (v) => HEIGHT - PAD.bottom - (v / yMax) * (HEIGHT - PAD.top - PAD.bottom);

  const leaguePoints = trend.map((t) => `${xScale(t.matchday)},${yScale(t.leagueAvg)}`).join(' ');
  const teamPoints = trend
    .filter((t) => t.teamValue !== null)
    .map((t) => `${xScale(t.matchday)},${yScale(t.teamValue)}`)
    .join(' ');

  const gridLines = [];
  for (let v = 0; v <= yMax; v += 2) gridLines.push(v);

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
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Average audience per matchday across the season">
          {gridLines.map((v) => (
            <line key={v} x1={PAD.left} x2={WIDTH - PAD.right} y1={yScale(v)} y2={yScale(v)} stroke="#f1f5f9" strokeWidth={1} />
          ))}
          {gridLines.map((v) => (
            <text key={v} x={PAD.left - 6} y={yScale(v) + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
              {v}M
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
        </svg>
      )}
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-gray-400">
        <span>Matchday 1</span>
        <span>Matchday {maxMatchday}</span>
      </div>
    </div>
  );
}
