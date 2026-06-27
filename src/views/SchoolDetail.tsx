import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useNav } from "@/store/useNav";
import { useToast } from "@/store/useToast";
import { Button } from "@/components/ui/button";
import { TrendChart, type TrendPoint } from "@/components/ui/TrendChart";
import { ScoreGrid } from "@/components/ui/ScoreGrid";
import { GuidanceCard } from "@/components/ui/GuidanceCard";
import { PlanCard } from "@/components/ui/PlanCard";
import { EffectCard } from "@/components/ui/EffectCard";
import { TimetableCard } from "@/components/ui/TimetableCard";
import { buildGrid, buildGuidance, buildPace, buildEffect, subjectRates, weakestSubject, buildShareText, computeGap, findReference, type GapStatus } from "@/lib/logic";
import type { Attempt, School } from "@/lib/logic";

const GAP_TEXT: Record<GapStatus, string> = {
  PASS: "text-emerald-600",
  NEAR: "text-amber-500",
  BELOW: "text-rose-600",
  NO_LINE: "text-neutral-400",
};
const GAP_BG: Record<GapStatus, string> = {
  PASS: "bg-emerald-500",
  NEAR: "bg-amber-500",
  BELOW: "bg-rose-500",
  NO_LINE: "bg-neutral-300",
};
const GAP_LABEL: Record<GapStatus, string> = {
  PASS: "合格圏",
  NEAR: "あと少し",
  BELOW: "要強化",
  NO_LINE: "最低点 未入力",
};

function rateColor(rate: number | null): string {
  if (rate == null) return "bg-neutral-200";
  if (rate >= 70) return "bg-emerald-500";
  if (rate >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export function SchoolDetail() {
  const { schoolId } = useNav();
  const nav = useNav();
  const toast = useToast();
  const { schools, attempts, updateAttempt } = useStore();
  const [tab, setTab] = useState<"now" | "plan" | "timetable" | "records">("now");
  const school = schools.find((s) => s.id === schoolId);
  if (!school) {
    nav.goHome();
    return null;
  }

  const grid = buildGrid(school, attempts); // 年度降順
  const todayISO = new Date().toISOString().slice(0, 10);
  const pace = buildPace(school, attempts, todayISO);
  const effect = buildEffect(school, attempts);
  const rates = subjectRates(school, attempts);
  const anyRate = rates.some((r) => r.rate != null);
  const weak = weakestSubject(school, attempts);

  // 推移は時系列昇順(古い→新しい)
  const chrono = attempts
    .filter((a) => a.schoolId === school.id)
    .slice()
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : (a.round || "") < (b.round || "") ? -1 : 1));
  const trend: TrendPoint[] = chrono.map((a) => {
    const g = computeGap(school, a);
    const ref = findReference(school, a.year, a.round);
    return { label: `${String(a.year).slice(2)}${a.round || ""}`, total: g.total, minPass: g.minPass, avg: ref?.avg ?? null, status: g.status };
  });

  function share() {
    if (!school || !grid.length) return;
    const text = buildShareText(school, grid[0].attempt, grid[0].gap);
    const url = location.origin + location.pathname;
    if (navigator.share) {
      void navigator.share({ text, url }).catch(() => {});
      return;
    }
    const full = `${text} ${url}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(full).then(
        () => toast.show("コピーしました。Xや家族LINEに貼れます"),
        () => toast.show("コピーできませんでした"),
      );
    } else toast.show("コピーできませんでした");
  }

  const sourceNote = school.source && (
    <p className="px-1 pt-1 text-[11px] leading-relaxed text-neutral-400">
      合格最低点・平均点は<b>目安</b>です。出典:
      {school.source.url ? (
        <a href={school.source.url} target="_blank" rel="noreferrer" className="underline">{school.source.label}</a>
      ) : (
        school.source.label
      )}
      {school.source.asof && `(${school.source.asof}時点)`}。最新・正確な情報は各校公式でご確認ください。
    </p>
  );

  // タブ名は扱う対象=名詞で揃える:いま/過去問/結果。
  // 第2タブは「計画＋実行(やる過去問を決めて記録する)」=過去問そのものを扱う場なので「過去問」。
  const TABS: { id: typeof tab; label: string }[] = [
    { id: "now", label: "いま" },
    { id: "plan", label: "過去問" },
    { id: "timetable", label: "時間割" },
    { id: "records", label: "結果" },
  ];

  return (
    <div className="space-y-4">
      {/* 印刷時のみ出る:学校名＋グリッド＋出典(塾持参・壁貼り用)。タブ状態に依らず常にDOMに置く。 */}
      <div className="hidden print:block">
        <div className="text-lg font-bold text-neutral-900">{school.name} 過去問グリッド</div>
        <div className="mb-3 text-xs text-neutral-500">出力日 {new Date().toLocaleDateString("ja-JP")}</div>
        {grid.length > 0 && <ScoreGrid school={school} attempts={attempts} />}
        {sourceNote}
      </div>

      {/* 画面UI(印刷では非表示)。タブで「いま/計画/記録」に分けて1ページの密度を下げる。 */}
      <div className="no-print space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="mincho text-[24px] tracking-tight text-sumi">
            {school.name}
            {school.sample && <span className="ml-1.5 align-middle text-xs font-medium text-sumi/40">サンプル</span>}
          </h1>
          <Button variant="ghost" size="sm" onClick={() => nav.goSchoolForm(school.id)}>
            学校を編集
          </Button>
        </div>

        {/* タブバー(朱の下線=アイデンティティ) */}
        <div className="flex gap-1 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative px-3 py-2.5 text-sm font-semibold transition-colors ${tab === t.id ? "text-sumi" : "text-sumi/45"}`}
            >
              {t.label}
              {tab === t.id && <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-shu" aria-hidden="true" />}
            </button>
          ))}
        </div>

        {/* ── いま:本番まで・見立て・効いているか ── */}
        {tab === "now" && (
          <div className="space-y-4">
            {(pace.daysLeft != null || pace.remain > 0 || effect.done > 0) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-sumi/[0.04] px-4 py-2.5 text-sm">
                {pace.daysLeft != null && pace.daysLeft >= 0 && (
                  <span className="text-sumi/80">本番まで <b className="nums text-sumi">{pace.daysLeft}</b>日</span>
                )}
                {pace.remain > 0 && (
                  <span className="text-sumi/70">
                    未消化 <b className="nums text-sumi">{pace.remain}</b>コマ
                    {pace.daysPerSlot != null && <span className={`ml-1 text-xs ${pace.tight ? "text-rose-600" : "text-sumi/50"}`}>({pace.daysPerSlot}日に1コマ)</span>}
                  </span>
                )}
                {effect.done > 0 && (
                  <span className="text-sumi/70">直し <b className="nums text-sumi">{effect.reviewed}/{effect.done}</b></span>
                )}
              </div>
            )}
            <GuidanceCard g={buildGuidance(school, attempts)} onNext={() => nav.goAttemptForm(school.id, null)} />
            {grid.length > 0 && <EffectCard e={effect} />}
          </div>
        )}

        {/* ── 過去問:やる過去問を決めて消化＝記録する本拠(計画＋実行) ── */}
        {tab === "plan" && (
          <div className="space-y-4">
            <PlanCard school={school} attempts={attempts} />
            <Button size="block" onClick={() => nav.goAttemptForm(school.id, null)}>
              ＋ 結果を記録
            </Button>
          </div>
        )}

        {/* ── 時間割:過去問の弱点から学習計画を提案→親が微調整 ── */}
        {tab === "timetable" && <TimetableCard school={school} attempts={attempts} />}

        {/* ── 結果:グリッド・伸び・科目別・記録一覧(=記録の結果を見る) ── */}
        {tab === "records" && (
          <div className="space-y-4">
            {grid.length > 0 ? (
              <>
                <ScoreGrid school={school} attempts={attempts} onPick={(a) => nav.goAttemptForm(school.id, a.id)} />
                {trend.length >= 2 && <TrendChart points={trend} />}
                {anyRate && (
                  <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
                    <div className="mb-2 text-xs font-semibold text-neutral-500">科目別の平均得点率</div>
                    <div className="space-y-1.5">
                      {rates.map((r) => (
                        <div key={r.name} className="flex items-center gap-2.5">
                          <span className="w-12 flex-none text-sm font-semibold text-neutral-700">{r.name}</span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                            <div className={`h-full rounded-full ${rateColor(r.rate)}`} style={{ width: `${r.rate ?? 0}%` }} />
                          </div>
                          <span className="nums w-10 flex-none text-right text-xs text-neutral-500">{r.rate != null ? `${r.rate}%` : "—"}</span>
                        </div>
                      ))}
                    </div>
                    {weak && (
                      <div className="mt-2.5 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        弱点は <b>{weak.name}</b>(平均{weak.rate}%)。ここに時間を寄せるのが合格への近道。
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2.5">
                  {grid.map(({ attempt: a, gap: g }) => (
                    <AttemptCard key={a.id} school={school} attempt={a} status={g.status} onClick={() => nav.goAttemptForm(school.id, a.id)} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <Button variant="ghost" size="block" onClick={share}>
                    シェア
                  </Button>
                  <Button variant="ghost" size="block" onClick={() => window.print()}>
                    印刷 / PDF
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-line bg-card p-5 text-center text-sm text-neutral-500">
                まだ記録がありません。<br />
                <button type="button" className="font-semibold text-brand underline" onClick={() => setTab("plan")}>
                  「過去問」タブ
                </button>
                で記録すると、ここに結果が出ます。
              </div>
            )}
          </div>
        )}

        {sourceNote}
      </div>
    </div>
  );

  function AttemptCard({
    school,
    attempt: a,
    status,
    onClick,
  }: {
    school: School;
    attempt: Attempt;
    status: GapStatus;
    onClick: () => void;
  }) {
    const g = computeGap(school, a);
    // 合格最低点までのゲージ(0..100%)。最低点なしはゲージ無し。
    const pct = g.minPass != null && g.maxTotal > 0 ? Math.max(0, Math.min(100, (g.total / Math.max(g.minPass, 1)) * 100)) : null;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onClick()}
        className="block w-full cursor-pointer rounded-2xl border border-line bg-card p-4 text-left shadow-sm active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-neutral-900">
              {a.year}年度{a.round}
            </div>
            <div className="nums mt-0.5 text-xs text-neutral-500">
              {g.total}/{g.maxTotal}点{g.minPass != null && ` ・ 最低点 ${g.minPass}`}
            </div>
          </div>
          <div className="text-right">
            <div className={`nums text-3xl font-extrabold leading-none ${GAP_TEXT[status]}`}>
              {g.gap != null ? `${g.gap >= 0 ? "+" : ""}${g.gap}` : "—"}
            </div>
            <div className={`text-[11px] font-semibold ${GAP_TEXT[status]}`}>
              {status === "NO_LINE" ? GAP_LABEL[status] : `${GAP_LABEL[status]}(最低点まで${g.gap != null && g.gap < 0 ? `あと${-g.gap}点` : "到達)"}`}
            </div>
          </div>
        </div>
        {pct != null && (
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div className={`h-full rounded-full ${GAP_BG[status]}`} style={{ width: `${pct}%` }} />
          </div>
        )}
        {/* 解き直しトグル=努力の最小入力(1タップ・任意)。やりっぱなし防止。 */}
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            updateAttempt(a.id, { reviewed: !a.reviewed });
          }}
          className={`mt-2.5 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
            a.reviewed ? "border-shu/30 bg-shu/10 text-shu" : "border-line bg-card text-sumi/45"
          }`}
        >
          <span className={`grid h-3.5 w-3.5 place-items-center rounded-full text-[9px] ${a.reviewed ? "bg-shu text-white" : "border border-sumi/30"}`}>
            {a.reviewed ? "✓" : ""}
          </span>
          {a.reviewed ? "解き直し済み" : "解き直しは？"}
        </button>
      </div>
    );
  }
}
