import { formatNumber } from '../lib/formatNumber.js';

// Fixed categorical colours matching SponsorBadges elsewhere in the app -
// identity for these three activation types is already established there,
// so the donut reuses it rather than inventing a new mapping. Validated
// (light mode): CVD-adjacent ΔE 19.6+, normal-vision floor 31.7+.
const COLORS = {
  MatchdaySponsor: '#d97706',
  PlayerMascot: '#9333ea',
  Walkabout: '#0d9488',
};

const SIZE = 160;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ActivationDonut({ activations }) {
  const total = activations.reduce((a, b) => a + b.total, 0);

  let cursor = 0;
  const segments = activations.map((a) => {
    const fraction = total > 0 ? a.total / total : 0;
    const dash = fraction * CIRCUMFERENCE;
    const seg = { ...a, dash, offset: -cursor * CIRCUMFERENCE, fraction };
    cursor += fraction;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Audience share by activation type">
        {total === 0 ? (
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
        ) : (
          segments.map(
            (s) =>
              s.fraction > 0 && (
                <circle
                  key={s.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={COLORS[s.key]}
                  strokeWidth={STROKE}
                  strokeDasharray={`${s.dash} ${CIRCUMFERENCE - s.dash}`}
                  strokeDashoffset={s.offset}
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
              )
          )
        )}
        <text x={SIZE / 2} y={SIZE / 2 - 2} textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f1e54">
          {formatNumber(total)}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 16} textAnchor="middle" fontSize="9" fill="#9ca3af">
          total audience
        </text>
      </svg>
      <ul className="flex flex-col gap-1.5 text-xs">
        {activations.map((a) => (
          <li key={a.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[a.key] }} />
            <span className="w-32 shrink-0 font-semibold text-gray-600">{a.label}</span>
            <span className="font-bold text-[#0f1e54]">{total > 0 ? `${((a.total / total) * 100).toFixed(0)}%` : '-'}</span>
            <span className="text-gray-400">({a.count})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
