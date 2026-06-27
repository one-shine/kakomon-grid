import { useState } from "react";
import { ArrowRight, ClipboardList, Plus, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useNav } from "@/store/useNav";
import { Stepper } from "./Stepper";
import { buildPlanRows, planProgress, type School, type Attempt } from "@/lib/logic";

// 過去問プラン=「計画→消化→記録」を回す中核。やる予定のコマ・消化率・未消化を一枚に。
// 記録するとそのコマが「済」になり、下のグリッド(結果)に流れ込む。
export function PlanCard({ school, attempts }: { school: School; attempts: Attempt[] }) {
  const nav = useNav();
  const { addPlanSlot, removePlanSlot } = useStore();
  const thisYear = new Date().getFullYear();
  const rows = buildPlanRows(school, attempts);
  const prog = planProgress(school, attempts);
  const planned = rows.filter((r) => !r.done);

  const earliest = rows.length ? Math.min(...rows.map((r) => r.year)) : thisYear - 1;
  const [addYear, setAddYear] = useState<number>(earliest - 1);
  const [adding, setAdding] = useState(false);

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-[0_1px_3px_rgba(33,30,26,0.05)]">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ClipboardList size={15} className="text-brand" />
          <span className="text-[11px] font-semibold tracking-[0.12em] text-sumi/55">やる過去問</span>
        </div>
        <span className="nums text-sm font-bold text-sumi">
          消化 {prog.done}
          <span className="text-sumi/40">/{prog.total}</span>
        </span>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-sumi/10">
        <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${prog.rate}%` }} />
      </div>

      {planned.length > 0 ? (
        <div className="space-y-1.5">
          {planned.map((r) => (
            <div key={`${r.year}-${r.round}`} className="flex items-center gap-2 rounded-xl bg-sumi/[0.035] py-2 pl-3 pr-2">
              <span className="flex-1 text-sm font-semibold text-sumi/80">
                {r.year}年度{r.round}
                <span className="ml-2 rounded bg-sumi/10 px-1.5 py-0.5 text-[10px] font-bold text-sumi/45">未</span>
              </span>
              <button
                type="button"
                onClick={() => nav.goAttemptForm(school.id, null, { year: r.year, round: r.round })}
                className="inline-flex items-center gap-0.5 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-bold text-white active:opacity-90"
              >
                記録する <ArrowRight size={13} />
              </button>
              <button
                type="button"
                aria-label="予定から外す"
                onClick={() => removePlanSlot(school.id, r.year, r.round)}
                className="grid h-7 w-7 flex-none place-items-center rounded-lg text-sumi/35 active:bg-sumi/10"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-sumi/55">予定はすべて消化。お疲れさま。次の年度を足せます。</p>
      )}

      {adding ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <Stepper value={addYear} onChange={setAddYear} min={1990} max={thisYear + 1} suffix="年" />
          <button
            type="button"
            onClick={() => {
              addPlanSlot(school.id, { year: addYear, round: "" });
              setAddYear(addYear - 1);
            }}
            className="rounded-lg bg-brand px-3.5 py-2 text-sm font-bold text-white active:opacity-90"
          >
            追加
          </button>
          <button type="button" onClick={() => setAdding(false)} className="text-sm text-sumi/50">
            閉じる
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
          <Plus size={15} /> やる過去問を追加
        </button>
      )}
    </div>
  );
}
