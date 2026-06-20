// 過去問の「伸び」を見せる軽量SVG折れ線(依存ゼロ=no-code床を守る)。
// 合計点(藍の実線・マーカーは信号色)と、各回の合格最低点(破線)を重ねる。
import type { GapStatus } from "@/lib/logic";

export interface TrendPoint {
  label: string;
  total: number;
  minPass: number | null;
  avg?: number | null; // 同梱データの受験者平均点(目安)
  status: GapStatus;
}

const DOT: Record<GapStatus, string> = {
  PASS: "#059669", // emerald-600
  NEAR: "#f59e0b", // amber-500
  BELOW: "#e11d48", // rose-600
  NO_LINE: "#a1a1aa", // neutral-400
};

export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null; // 2回以上で「伸び」を描く

  const W = 320;
  const H = 132;
  const padX = 14;
  const padTop = 14;
  const padBottom = 22;

  const totals = points.map((p) => p.total);
  const passes = points.map((p) => p.minPass).filter((v): v is number => v != null);
  const avgs = points.map((p) => p.avg).filter((v): v is number => v != null);
  const lo = Math.min(...totals, ...passes, ...avgs);
  const hi = Math.max(...totals, ...passes, ...avgs);
  const span = Math.max(1, hi - lo);
  const min = lo - span * 0.12;
  const max = hi + span * 0.12;

  const x = (i: number) => padX + (i * (W - padX * 2)) / (points.length - 1);
  const y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBottom);

  const totalPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");
  const passPts = points.map((p, i) => (p.minPass != null ? `${x(i).toFixed(1)},${y(p.minPass).toFixed(1)}` : null)).filter(Boolean) as string[];
  const avgPts = points.map((p, i) => (p.avg != null ? `${x(i).toFixed(1)},${y(p.avg).toFixed(1)}` : null)).filter(Boolean) as string[];
  const hasAvg = avgPts.length >= 2;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-500">合計点の推移(合格最低点との距離)</span>
        <span className="flex items-center gap-2 text-[10px] text-neutral-400">
          <span className="inline-flex items-center gap-1"><i className="inline-block h-0.5 w-3 bg-brand" />得点</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-0 w-3 border-t border-dashed border-neutral-400" />最低点</span>
          {hasAvg && <span className="inline-flex items-center gap-1"><i className="inline-block h-0 w-3 border-t border-dotted border-sky-400" />平均</span>}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="得点推移">
        {hasAvg && (
          <polyline points={avgPts.join(" ")} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="1 3" strokeLinecap="round" />
        )}
        {passPts.length >= 2 && (
          <polyline points={passPts.join(" ")} fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="4 3" />
        )}
        <path d={totalPath} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.total)} r="4" fill={DOT[p.status]} stroke="#fff" strokeWidth="1.5" />
            <text x={x(i)} y={H - 7} textAnchor="middle" className="nums" fontSize="9" fill="#86868b">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
