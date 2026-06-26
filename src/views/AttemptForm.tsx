import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useNav } from "@/store/useNav";
import { useToast } from "@/store/useToast";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/Stepper";
import { validateAttempt, findReference, computeGap } from "@/lib/logic";

const ROUND_CHIPS = [
  { v: "", label: "なし" },
  { v: "①", label: "①" },
  { v: "②", label: "②" },
  { v: "③", label: "③" },
];

export function AttemptForm() {
  const { schoolId, attemptId } = useNav();
  const nav = useNav();
  const toast = useToast();
  const { schools, attempts, addAttempt, updateAttempt, removeAttempt, restoreAttempt } = useStore();
  const school = schools.find((s) => s.id === schoolId);
  const editing = attemptId ? attempts.find((a) => a.id === attemptId) ?? null : null;

  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(editing ? editing.year : thisYear);
  const [round, setRound] = useState(editing?.round ?? "");
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const s of school?.subjects ?? []) {
      const v = editing?.scores[s.name];
      init[s.name] = v === 0 || v != null ? String(v) : "";
    }
    return init;
  });
  const [minPass, setMinPass] = useState<string>(editing && editing.minPass != null ? String(editing.minPass) : "");
  const [memo, setMemo] = useState(editing?.memo ?? "");
  const [errors, setErrors] = useState<string[]>([]);

  if (!school) {
    nav.goHome();
    return null;
  }

  function collectScores(): Record<string, number | null> {
    const out: Record<string, number | null> = {};
    for (const s of school!.subjects) {
      const raw = scores[s.name];
      out[s.name] = raw === "" || raw == null ? null : Number(raw);
    }
    return out;
  }

  // 入れながら出る合計と「あと何点」のライブ表示(暗算不要・入れる手応え)
  const live = computeGap(school, { scores: collectScores(), minPass: minPass === "" ? null : Number(minPass) });
  const anyScore = Object.values(scores).some((v) => v !== "" && v != null);

  function save() {
    const draft = {
      year,
      round: round.trim(),
      scores: collectScores(),
      minPass: minPass === "" ? null : Number(minPass),
      memo: memo.trim(),
    };
    const v = validateAttempt(school!, draft);
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    if (editing) {
      updateAttempt(editing.id, draft);
      nav.goDetail(school!.id);
      toast.show("更新しました");
    } else {
      const id = addAttempt({ schoolId: school!.id, ...draft });
      nav.goDetail(school!.id);
      toast.show("記録しました", "取り消す", () => {
        removeAttempt(id);
        toast.show("取り消しました");
      });
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="mincho text-[22px] text-sumi">{editing ? "記録を編集" : "結果を記録"}</h1>

      <div className="grid grid-cols-2 gap-3">
        <Field label="年度">
          <Stepper value={year} onChange={setYear} min={1990} max={thisYear + 1} suffix="年" />
        </Field>
        <Field label="回(任意)">
          <div className="flex flex-wrap gap-1.5">
            {ROUND_CHIPS.map((c) => (
              <Chip key={c.label} active={round === c.v} onClick={() => setRound(c.v)}>
                {c.label}
              </Chip>
            ))}
            {round !== "" && !ROUND_CHIPS.some((c) => c.v === round) && (
              <Chip active onClick={() => setRound("")}>
                {round}
              </Chip>
            )}
          </div>
        </Field>
      </div>

      <div className="space-y-2.5">
        {school.subjects.map((s, i) => (
          <Field key={s.name} label={`${s.name}(満点${s.max})`}>
            <input
              className={inputCls}
              type="number"
              inputMode="numeric"
              autoFocus={!editing && i === 0}
              value={scores[s.name] ?? ""}
              onChange={(e) => setScores((prev) => ({ ...prev, [s.name]: e.target.value }))}
            />
          </Field>
        ))}
      </div>

      {/* 入れながら出る合計＋あと何点(ライブ) */}
      {anyScore && (
        <div className="flex items-center justify-between rounded-xl bg-sumi/[0.045] px-4 py-3">
          <div className="text-sm text-sumi/70">
            合計 <b className="nums text-base text-sumi">{live.total}</b>
            <span className="nums text-neutral-400">/{live.maxTotal}</span>
          </div>
          {live.gap != null ? (
            <div
              className={`text-sm font-semibold ${live.status === "PASS" ? "text-emerald-600" : live.status === "NEAR" ? "text-amber-600" : "text-rose-600"}`}
            >
              {live.gap >= 0 ? `合格最低点 +${live.gap}点` : `最低点まで あと${-live.gap}点`}
            </div>
          ) : (
            <div className="text-xs text-neutral-400">最低点を入れると「あと何点」が出ます</div>
          )}
        </div>
      )}

      <Field label="合格最低点(任意・あとで追記可)">
        <input className={inputCls} type="number" inputMode="numeric" placeholder="例:320" value={minPass} onChange={(e) => setMinPass(e.target.value)} />
        {(() => {
          const ref = findReference(school!, year, round.trim());
          if (!ref || (ref.minPass == null && ref.avg == null)) return null;
          return (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span>
                目安:
                {ref.minPass != null && <> 合格最低点 <b className="nums text-neutral-700">{ref.minPass}</b></>}
                {ref.avg != null && <> ・ 受験者平均 <b className="nums text-neutral-700">{ref.avg}</b></>}
              </span>
              {ref.minPass != null && (
                <button type="button" className="rounded-full bg-brand/10 px-2.5 py-0.5 font-semibold text-brand-ink" onClick={() => setMinPass(String(ref.minPass))}>
                  入れる
                </button>
              )}
            </div>
          );
        })()}
      </Field>
      <Field label="メモ(任意)">
        <input className={inputCls} maxLength={60} placeholder="時間配分きつい 等" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </Field>

      {errors.length > 0 && (
        <div className="text-sm text-red-600">
          {errors.map((e, i) => (
            <div key={i}>・{e}</div>
          ))}
        </div>
      )}

      <Button size="block" onClick={save}>
        保存
      </Button>

      {editing && (
        <div className="mt-6 grid gap-2.5 border-t border-line pt-4">
          <Button
            variant="dangerGhost"
            size="block"
            onClick={() => {
              const removed = removeAttempt(editing.id);
              nav.goDetail(school!.id);
              if (removed) {
                toast.show("削除しました", "取り消す", () => {
                  restoreAttempt(removed);
                  toast.show("元に戻しました");
                });
              }
            }}
          >
            この記録を削除
          </Button>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-card px-3 py-3 text-base text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-300";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-xs text-neutral-500">{label}</span>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-10 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
        active ? "border-neutral-900 bg-neutral-900 text-white" : "border-line bg-card text-neutral-700 active:bg-neutral-50"
      }`}
    >
      {children}
    </button>
  );
}
