import { CheckCircle2, TrendingUp } from "lucide-react";
import type { Effect, EffectTrend } from "@/lib/logic";

// 「効いているか」=努力が点に変わっているかの手応え。因果は断定せず事実を並置する。
// 計画→実施→記録ときて、ここで「で、効いてる?」に答えるのがPDCAの心臓。
const HEAD: Record<EffectTrend, { bar: string; txt: string; label: string }> = {
  up: { bar: "bg-emerald-600", txt: "text-emerald-700", label: "頑張りは、点に変わっている" },
  flat: { bar: "bg-amber-500", txt: "text-amber-700", label: "まだ大きくは動いていない時期" },
  down: { bar: "bg-rose-600", txt: "text-rose-700", label: "難しい年度もある。直しで取り返す" },
  none: { bar: "bg-sumi/25", txt: "text-sumi", label: "記録が2回分たまると、伸びが見える" },
};

export function EffectCard({ e }: { e: Effect }) {
  const h = HEAD[e.trend];
  const reviewRate = e.done > 0 ? Math.round((e.reviewed / e.done) * 100) : 0;
  return (
    <div className="flex items-stretch overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_3px_rgba(33,30,26,0.05)]">
      <span className={`w-1.5 flex-none ${h.bar}`} aria-hidden="true" />
      <div className="flex-1 p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="seal grid h-5 w-5 flex-none place-items-center text-[11px]">効</span>
          <span className="text-[11px] font-semibold tracking-[0.14em] text-sumi/45">効いているか</span>
        </div>
        <div className={`mincho text-[20px] leading-snug ${h.txt}`}>{h.label}</div>

        {e.rise != null && (
          <div className="mt-2 flex items-center gap-1.5 text-[15px] text-sumi/85">
            <TrendingUp size={16} className={e.rise >= 0 ? "text-emerald-600" : "text-rose-500"} />
            初回から 得点率 <b className="nums">{e.rise >= 0 ? "+" : ""}{e.rise}pt</b>
          </div>
        )}

        {e.done > 0 && (
          <div className="mt-3 rounded-xl bg-sumi/[0.045] px-3.5 py-2.5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-semibold text-sumi/70">
                <CheckCircle2 size={13} className="text-shu/70" /> 解き直し(やりっぱなし防止)
              </span>
              <span className="nums font-bold text-sumi">{e.reviewed}/{e.done}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sumi/10">
              <div className="h-full rounded-full bg-shu/70" style={{ width: `${reviewRate}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
