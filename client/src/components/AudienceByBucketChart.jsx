import { formatNumber } from '../lib/formatNumber.js';

export default function AudienceByBucketChart({ title, buckets, accent = '#1fd8c9' }) {
  if (buckets.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
        <h3 className="mb-2 text-sm font-bold text-[#0f1e54]">{title}</h3>
        <p className="text-xs text-gray-400">No played games with this data yet.</p>
      </div>
    );
  }

  const max = Math.max(...buckets.map((b) => b.avg), 1);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg shadow-black/20">
      <h3 className="mb-3 text-sm font-bold text-[#0f1e54]">{title}</h3>
      <div className="flex flex-col gap-1.5">
        {buckets.map((b) => (
          <div key={b.key} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs font-semibold text-gray-600">{b.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${(b.avg / max) * 100}%`, background: accent }} />
            </div>
            <span className="w-14 shrink-0 text-right text-xs font-bold text-[#0f1e54]">{formatNumber(b.avg)}</span>
            <span className="w-12 shrink-0 text-right text-[10px] text-gray-400">{b.count}g</span>
          </div>
        ))}
      </div>
    </div>
  );
}
