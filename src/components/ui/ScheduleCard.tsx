import { CalendarDays, ExternalLink } from "lucide-react";
import { schoolMilestones, type School } from "@/lib/logic";

// 受験日程(出願開始/締切・試験日・合格発表)＋公式入試情報リンク。情報はホストせずリンクで解く。
function md(date: string): string {
  const [, mo, d] = date.split("-");
  return `${Number(mo)}/${Number(d)}`;
}

export function ScheduleCard({ school, todayISO }: { school: School; todayISO: string }) {
  const ms = schoolMilestones(school, todayISO);
  if (!ms.length && !school.admissionsUrl) return null;

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-[0_1px_3px_rgba(33,30,26,0.05)]">
      <div className="mb-2.5 flex items-center gap-1.5">
        <CalendarDays size={15} className="text-brand" />
        <span className="text-[11px] font-semibold tracking-[0.12em] text-sumi/55">受験日程</span>
      </div>

      {ms.length > 0 && (
        <div className="space-y-1.5">
          {ms.map((m) => (
            <div key={m.kind} className="flex items-center justify-between text-sm">
              <span className="text-sumi/70">{m.label}</span>
              <span className="flex items-baseline gap-2">
                <span className="nums text-sumi">{md(m.date)}</span>
                <span className={`nums text-xs ${m.days < 0 ? "text-sumi/35" : m.days <= 7 ? "font-bold text-shu" : "text-sumi/50"}`}>
                  {m.days < 0 ? "済" : m.days === 0 ? "今日" : `あと${m.days}日`}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {school.admissionsUrl && (
        <a
          href={school.admissionsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand"
        >
          公式の入試情報・出願ページ <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}
