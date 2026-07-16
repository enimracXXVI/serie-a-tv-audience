// A single ratio (games also on Sky, out of all played games) reads best as
// a meter, not a 2-slice pie - a pie needs >=3 meaningfully different parts
// to earn its shape; two-way splits are just a percentage.
const SIZE = 140;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function AudienceMeter({ label, pct, sub }) {
  const offset = CIRCUMFERENCE * (1 - pct / 100);
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <h3 className="self-start text-sm font-bold text-[#0f1e54]">{label}</h3>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${label}: ${pct.toFixed(0)}%`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#1fd8c9"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <text x={SIZE / 2} y={SIZE / 2 + 6} textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f1e54">
          {pct.toFixed(0)}%
        </text>
      </svg>
      <p className="text-center text-[11px] text-gray-500">{sub}</p>
    </div>
  );
}
