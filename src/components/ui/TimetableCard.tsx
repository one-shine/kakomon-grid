import { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { useStore } from "@/store/useStore";
import {
  suggestTimetable,
  defaultTimetable,
  planSummary,
  weakestSubject,
  buildPlanRows,
  kakomonLabel,
  isKakomon,
  WEEK_DAYS,
  TT_HOURS,
  SCHOOL_LABEL,
  CRAM_LABEL,
  KAKOMON_LABEL,
  type School,
  type Attempt,
} from "@/lib/logic";

// Outlook風の時間軸カレンダー(1日表示＋曜日切替)。開始→終了の2タップで範囲指定でき、
// 塾17-21などをまとめて置ける。学校は平日8-15を初期表示、過去問の弱点から空き時刻に学習を配置。
function eventClass(v: string): string {
  if (v === SCHOOL_LABEL) return "bg-sumi/10 text-sumi/55";
  if (v === CRAM_LABEL) return "bg-amber-100 text-amber-800";
  if (isKakomon(v)) return "bg-shu/15 text-shu";
  if (v) return "bg-brand/10 text-brand-ink";
  return "text-sumi/25";
}

export function TimetableCard({ school, attempts }: { school: School; attempts: Attempt[] }) {
  const { setTimetable } = useStore();
  // 未設定の学校は「提案済みの時間割」を最初から表示=過去問ゼロでも開いた瞬間に使える(空にしない)。
  const grid = school.timetable ?? suggestTimetable(school, attempts, defaultTimetable());
  const jsToMon = (new Date().getDay() + 6) % 7; // 月=0…日=6
  const [day, setDay] = useState<number>(jsToMon);
  // 範囲選択:a=開始枠, b=終了枠(index)。done=2タップ完了。
  const [range, setRange] = useState<{ a: number; b: number } | null>(null);
  const [done, setDone] = useState(false);

  // 過去問は「未消化の特定年度」を選べるようにする(一括りにしない)。無ければ汎用ラベル。
  const todoKakomon = buildPlanRows(school, attempts)
    .filter((r) => !r.done)
    .map((r) => kakomonLabel(r.year, r.round));
  const options = ["", SCHOOL_LABEL, CRAM_LABEL, ...school.subjects.map((s) => s.name), ...(todoKakomon.length ? todoKakomon : [KAKOMON_LABEL])];
  const sum = planSummary({ ...school, timetable: grid });
  const weak = weakestSubject(school, attempts);
  const hasAny = grid.some((r) => r.some((c) => c && c !== SCHOOL_LABEL));
  const alloc = school.subjects.map((s) => ({ name: s.name, n: grid.flat().filter((x) => x === s.name).length }));

  function resetSel() {
    setRange(null);
    setDone(false);
  }
  function tapSlot(hi: number) {
    if (range == null || done) {
      setRange({ a: hi, b: hi });
      setDone(false);
    } else {
      setRange({ a: Math.min(range.a, hi), b: Math.max(range.a, hi) });
      setDone(true);
    }
  }
  function fill(val: string) {
    if (!range) return;
    const ng = grid.map((r) => (r ? r.slice() : TT_HOURS.map(() => "")));
    for (let hi = range.a; hi <= range.b; hi++) ng[day][hi] = val;
    setTimetable(school.id, ng);
    resetSel();
  }
  const inRange = (hi: number) => range != null && hi >= range.a && hi <= range.b;

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {WEEK_DAYS.map((d, i) => (
          <button
            key={d}
            type="button"
            onClick={() => (setDay(i), resetSel())}
            className={`flex-1 rounded-lg py-1.5 text-sm font-bold transition-colors ${
              i === day ? "bg-brand text-white" : i >= 5 ? "text-shu/80" : "text-sumi/55"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-sumi/55">
          学習 <b className="nums text-sumi">{sum.studyHours}</b>時間/週 ・ 塾 <b className="nums text-sumi">{sum.cramHours}</b>
        </span>
        <button
          type="button"
          onClick={() => (setTimetable(school.id, suggestTimetable(school, attempts, grid)), resetSel())}
          className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-bold text-white active:opacity-90"
        >
          <Sparkles size={13} /> 空き時間に提案
        </button>
      </div>

      {/* 弱点を踏まえた配分であることのアピール(=過去問から学習計画を立てる差別化の核) */}
      {weak ? (
        <div className="flex gap-2 rounded-xl bg-shu/[0.06] px-3 py-2.5">
          <Sparkles size={14} className="mt-0.5 flex-none text-shu/70" />
          <p className="text-xs leading-relaxed text-sumi/80">
            過去問の弱点 <b className="text-shu">{weak.name}</b>(平均{weak.rate}%)を<b>多めに</b>配分しています。
            {hasAny && <span className="mt-0.5 block text-sumi/55">今週の配分 {alloc.map((c) => `${c.name}${c.n}`).join("・")}</span>}
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-sumi/[0.04] px-3 py-2.5 text-xs leading-relaxed text-sumi/55">
          今は科目を<b>均等に</b>配分しています。<b>過去問が入ると</b>、弱点に合わせて配分の精度が上がります。
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_3px_rgba(33,30,26,0.05)]">
        {TT_HOURS.map((h, hi) => {
          const v = grid[day]?.[hi] ?? "";
          return (
            <div key={h} className="flex items-stretch border-b border-line/70 last:border-0">
              <div className="w-12 flex-none py-2 text-right text-[11px] text-sumi/40">{h}:00</div>
              <button
                type="button"
                onClick={() => tapSlot(hi)}
                className={`my-0.5 mr-1 flex-1 rounded-md px-2.5 py-2 text-left text-sm font-semibold ${eventClass(v)} ${
                  inRange(hi) ? "ring-2 ring-brand/60" : ""
                }`}
              >
                {v || "＋ 予定を入れる"}
              </button>
            </div>
          );
        })}
      </div>

      {range != null ? (
        <div className="rounded-xl border border-line bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sumi/55">
              {TT_HOURS[range.a]}:00〜{TT_HOURS[range.b] + 1}:00 に入れる
              {!done && <span className="ml-1 font-normal text-sumi/40">(終わりの枠をタップで範囲指定)</span>}
            </span>
            <button type="button" onClick={resetSel} className="text-xs text-sumi/45">
              やめる
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {options.map((o) => (
              <button
                key={o || "empty"}
                type="button"
                onClick={() => fill(o)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  o === "" ? "border-line text-sumi/50" : `border-transparent ${eventClass(o)}`
                }`}
              >
                {o === "" ? "空ける" : o}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="px-1 text-[11px] leading-relaxed text-sumi/45">
          枠をタップ→続けてもう1枠タップで<b>範囲指定</b>(塾17–21などをまとめて)。学校は平日8–15に初期表示。
          <b>塾</b>を置くと空き時刻に弱点科目と週末の過去問を配置(<b>目安</b>)。
        </p>
      )}

      <div className="flex justify-end px-1">
        <button
          type="button"
          onClick={() => (setTimetable(school.id, defaultTimetable()), resetSel())}
          className="inline-flex items-center gap-1 text-xs text-sumi/45"
        >
          <RotateCcw size={12} /> リセット(学校だけに)
        </button>
      </div>
    </div>
  );
}
