import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useNav } from "@/store/useNav";
import { useToast } from "@/store/useToast";
import { Button } from "@/components/ui/button";
import { validateAttempt, findReference } from "@/lib/logic";

export function AttemptForm() {
  const { schoolId, attemptId } = useNav();
  const nav = useNav();
  const toast = useToast();
  const { schools, attempts, addAttempt, updateAttempt, removeAttempt, restoreAttempt } = useStore();
  const school = schools.find((s) => s.id === schoolId);
  const editing = attemptId ? attempts.find((a) => a.id === attemptId) ?? null : null;

  const [year, setYear] = useState<string>(editing ? String(editing.year) : String(new Date().getFullYear()));
  const [round, setRound] = useState(editing?.round ?? "");
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const s of school?.subjects ?? []) {
      const v = editing?.scores[s.name];
      init[s.name] = v === 0 || (v != null) ? String(v) : "";
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

  function save() {
    const draft = {
      year: Number(year),
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
    <div className="space-y-3.5">
      <h1 className="text-xl font-bold text-neutral-900">{editing ? "記録を編集" : "結果を記録"}</h1>

      <div className="grid grid-cols-[2fr_1fr] gap-2.5">
        <Field label="年度">
          <input className={inputCls} type="number" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
        </Field>
        <Field label="回(任意)">
          <input className={inputCls} maxLength={6} placeholder="①" value={round} onChange={(e) => setRound(e.target.value)} />
        </Field>
      </div>

      <div className="space-y-2.5">
        {school.subjects.map((s) => (
          <Field key={s.name} label={`${s.name}(満点${s.max})`}>
            <input
              className={inputCls}
              type="number"
              inputMode="numeric"
              value={scores[s.name] ?? ""}
              onChange={(e) => setScores((prev) => ({ ...prev, [s.name]: e.target.value }))}
            />
          </Field>
        ))}
      </div>

      <Field label="合格最低点(任意・あとで追記可)">
        <input className={inputCls} type="number" inputMode="numeric" placeholder="例:320" value={minPass} onChange={(e) => setMinPass(e.target.value)} />
        {(() => {
          const ref = findReference(school!, Number(year), round.trim());
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
        <div className="mt-6 grid gap-2.5 border-t border-neutral-200 pt-4">
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
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-300";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
