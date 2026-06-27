import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useNav } from "@/store/useNav";
import { useToast } from "@/store/useToast";
import { Button } from "@/components/ui/button";
import { latestGap, buildGuidance, type GapStatus, type GuidanceTone } from "@/lib/logic";

const BAR: Record<GapStatus, string> = {
  PASS: "bg-emerald-500",
  NEAR: "bg-amber-500",
  BELOW: "bg-rose-500",
  NO_LINE: "bg-neutral-300",
};
const CHIP: Record<GapStatus, string> = {
  PASS: "bg-emerald-50 text-emerald-700",
  NEAR: "bg-amber-50 text-amber-700",
  BELOW: "bg-rose-50 text-rose-700",
  NO_LINE: "bg-neutral-100 text-neutral-500",
};
const CHIP_LABEL: Record<GapStatus, string> = { PASS: "合格圏", NEAR: "あと少し", BELOW: "要強化", NO_LINE: "—" };
const GUIDE_TEXT: Record<GuidanceTone, string> = {
  good: "text-emerald-700",
  warn: "text-amber-700",
  hard: "text-rose-700",
  info: "text-neutral-600",
};

// 空状態で見せる「動く見本」=伸びている折れ線のミニプレビュー(価値を文字でなく絵で)
function SamplePreview() {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-500">見本:桜花中の過去問</span>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">合格圏 +12</span>
      </div>
      <svg viewBox="0 0 300 96" className="w-full" aria-hidden="true">
        <polyline points="18,78 105,66 192,44 282,28" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="4 3" />
        <path d="M18,84 L105,70 L192,46 L282,22" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {[[18,84,"#e11d48"],[105,70,"#f59e0b"],[192,46,"#f59e0b"],[282,22,"#059669"]].map(([x,y,c],i)=>(
          <circle key={i} cx={x as number} cy={y as number} r="4" fill={c as string} stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="nums mt-1 text-center text-[11px] text-neutral-400">9月→1月で 最低点−30 → +12 に伸びた</div>
    </div>
  );
}

export function Home() {
  const { schools, attempts, seedSample, clearSample, resetAll } = useStore();
  const nav = useNav();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  if (schools.length === 0) {
    return (
      <div className="anim-rise space-y-4 px-1 py-2">
        <div>
          <h1 className="mincho text-[28px] leading-[1.4] tracking-tight text-sumi">
            過去問は、<span className="relative whitespace-nowrap text-shu">伸び<span className="absolute -bottom-0.5 left-0 h-[3px] w-full rounded-full bg-shu/30" aria-hidden="true" /></span>を見るもの。
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-sumi/70">
            志望校×年度の得点と<b className="text-sumi">合格最低点との差</b>を、ひと目で。登録不要・端末内だけで完結。
          </p>
        </div>
        <SamplePreview />
        <Button size="block" onClick={() => seedSample()}>
          サンプルで試す
        </Button>
        <p className="text-center text-xs text-neutral-400">サンプルを見てから、自分の志望校を登録できます</p>
      </div>
    );
  }

  const hasSample = schools.some((s) => s.sample);

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {schools.map((sc) => {
          const lg = latestGap(sc, attempts);
          const count = attempts.filter((a) => a.schoolId === sc.id).length;
          const guide = buildGuidance(sc, attempts);
          const st: GapStatus = lg ? lg.status : "NO_LINE";
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => nav.goDetail(sc.id)}
              className="flex w-full items-stretch overflow-hidden rounded-2xl border border-line bg-card text-left shadow-sm active:scale-[0.99]"
            >
              <span className={`w-1.5 flex-none ${BAR[st]}`} aria-hidden="true" />
              <span className="flex-1 p-4">
                <span className="flex items-start justify-between gap-2">
                  <span>
                    <span className="block text-base font-bold text-neutral-900">
                      {sc.name}
                      {sc.sample && <span className="ml-1.5 text-xs font-medium text-neutral-400">サンプル</span>}
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-500">{sc.subjects.map((s) => `${s.name}${s.max}`).join("・")}</span>
                  </span>
                  {lg && (
                    <span className="flex flex-col items-end">
                      <span className={`nums text-xl font-extrabold leading-none ${st === "PASS" ? "text-emerald-600" : st === "NEAR" ? "text-amber-500" : st === "BELOW" ? "text-rose-600" : "text-neutral-400"}`}>
                        {lg.gap != null ? `${lg.gap >= 0 ? "+" : ""}${lg.gap}` : "—"}
                      </span>
                      <span className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${CHIP[st]}`}>{CHIP_LABEL[st]}</span>
                    </span>
                  )}
                </span>
                <span className={`mt-2 block text-sm font-semibold ${GUIDE_TEXT[guide.tone]}`}>
                  {guide.headline}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-400">
                  {count ? `${guide.detail}` : "まだ記録がありません"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-2.5 pt-1">
        <Button size="block" onClick={() => nav.goSchoolForm(null)}>
          ＋ 志望校を追加
        </Button>
        {hasSample && (
          <Button
            variant="ghost"
            size="block"
            onClick={() => {
              clearSample();
              toast.show("サンプルを消しました");
            }}
          >
            サンプルを消す
          </Button>
        )}
      </div>

      {/* 全データ初期化(端末内のみ・確認2段)。登録不要アプリの"やり直し"手段。 */}
      <div className="pt-6 text-center">
        {!confirmReset ? (
          <button type="button" className="text-xs text-sumi/40 underline" onClick={() => setConfirmReset(true)}>
            すべてのデータを初期化
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-rose-600">学校も記録もすべて消えます。取り消せません。</p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white active:opacity-90"
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                  toast.show("初期化しました");
                }}
              >
                本当に初期化する
              </button>
              <button type="button" className="px-3 py-2 text-sm text-sumi/55" onClick={() => setConfirmReset(false)}>
                やめる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
