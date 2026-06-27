import { useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { useStore } from "@/store/useStore";
import {
  suggestTimetable,
  emptyTimetable,
  defaultTimetable,
  planSummary,
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
  if (v === KAKOMON_LABEL) return "bg-shu/15 text-shu";
  if (v) return "bg-brand/10 text-brand-ink";
  return "text-sumi/25";
}

export function TimetableCard({ school, attempts }: { school: School; attempts: Attempt[] }) {
  const { setTimetable } = useStore();
  const grid = school.timetable ?? defaultTimetable();
  const jsToMon = (new Date().getDay() + 6) % 7; // 月=0…日=6
  const [day, setDay] = useState<number>(jsToMon);
  // 範囲選択:a=開始枠, b=終了枠(index)。done=2タップ完了。
  const [range, setRange] = useState<{ a: number; b: number } | null>(null);
  const [done, setDone] = useState(false);

  const options = ["", SCHOOL_LABEL, CRAM_LABEL, ...school.subjects.map((s) => s.name), KAKOMON_LABEL];
  const sum = planSummary({ ...school, timetable: grid });

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
          onClick={() => (setTimetable(school.id, emptyTimetable()), resetSel())}
          className="inline-flex items-center gap-1 text-xs text-sumi/45"
        >
          <RotateCcw size={12} /> 全消去
        </button>
      </div>
    </div>
  );
}
