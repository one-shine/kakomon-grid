import { ArrowRight, CheckCircle2, FileText, Target } from "lucide-react";
import { useNav } from "@/store/useNav";
import { buildWeeklyTodo, type School, type Attempt, type TodoItem } from "@/lib/logic";

// 「今週やること」=既存データから次の具体行動を提示(迷わせない=スタサプのミッションの思想)。
// 過去問軸を強め、新規入力は不要。各行はタップで該当画面へ。
const ICON = { review: CheckCircle2, kakomon: FileText, weak: Target } as const;

export function WeeklyTodoCard({
  school,
  attempts,
  onFocusWeak,
}: {
  school: School;
  attempts: Attempt[];
  onFocusWeak?: () => void;
}) {
  const nav = useNav();
  const items = buildWeeklyTodo(school, attempts);
  if (!items.length) return null;

  function act(it: TodoItem) {
    if (it.kind === "review" && it.attemptId) nav.goAttemptForm(school.id, it.attemptId);
    else if (it.kind === "kakomon" && it.year != null) nav.goAttemptForm(school.id, null, { year: it.year, round: it.round || "" });
    else if (it.kind === "weak") onFocusWeak?.();
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-[0_1px_3px_rgba(33,30,26,0.05)]">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="seal grid h-5 w-5 flex-none place-items-center text-[11px]">今</span>
        <span className="text-[11px] font-semibold tracking-[0.14em] text-sumi/45">今週やること</span>
      </div>
      <div className="space-y-1.5">
        {items.map((it, i) => {
          const Icon = ICON[it.kind];
          return (
            <button
              key={i}
              type="button"
              onClick={() => act(it)}
              className="flex w-full items-center gap-2.5 rounded-xl bg-sumi/[0.035] px-3 py-2.5 text-left active:bg-sumi/[0.06]"
            >
              <Icon size={16} className={`flex-none ${it.kind === "review" ? "text-shu/80" : "text-brand"}`} />
              <span className="flex-1 text-sm font-semibold text-sumi/85">{it.text}</span>
              <ArrowRight size={15} className="flex-none text-sumi/35" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
