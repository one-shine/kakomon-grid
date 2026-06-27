import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import type { Guidance, GuidanceTone } from "@/lib/logic";

// 指針カード=記録から導いた「いまの見立て」。詳細画面の一枚目。
// 「朱筆と紙」:生成りの紙面・墨の文字・明朝の見立て。色は信号(合否)にのみ。
const TONE: Record<GuidanceTone, { bar: string; head: string }> = {
  good: { bar: "bg-emerald-600", head: "text-emerald-700" },
  warn: { bar: "bg-amber-500", head: "text-amber-700" },
  hard: { bar: "bg-rose-600", head: "text-rose-700" },
  info: { bar: "bg-sumi/25", head: "text-sumi" },
};

export function GuidanceCard({ g, onNext }: { g: Guidance; onNext?: () => void }) {
  const t = TONE[g.tone];
  return (
    <div className="flex items-stretch overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_3px_rgba(33,30,26,0.05)]">
      <span className={`w-1.5 flex-none ${t.bar}`} aria-hidden="true" />
      <div className="flex-1 p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="seal grid h-5 w-5 flex-none place-items-center text-[11px]">見</span>
          <span className="text-[11px] font-semibold tracking-[0.14em] text-sumi/45">いまの見立て</span>
        </div>
        <div className={`mincho text-[21px] leading-snug ${t.head}`}>{g.headline}</div>
        <p className="mt-1.5 text-[15px] leading-relaxed text-sumi/85">{g.detail}</p>

        {g.lever && (
          <div className="mt-3 flex gap-2 rounded-xl bg-sumi/[0.045] px-3.5 py-3">
            <Sparkles size={16} className="mt-0.5 flex-none text-shu/70" />
            <p className="text-sm leading-relaxed text-sumi/80">{g.lever}</p>
          </div>
        )}

        {g.encouragement && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-sumi/55">
            <TrendingUp size={13} className="flex-none" />
            <span>{g.encouragement}</span>
          </div>
        )}

        {onNext && (
          <button
            type="button"
            onClick={onNext}
            className="mt-3.5 inline-flex items-center gap-1 text-sm font-semibold text-brand"
          >
            次の一手:{g.nextAction}
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
