import { useStore } from "@/store/useStore";
import { useNav } from "@/store/useNav";
import { useToast } from "@/store/useToast";
import { Button } from "@/components/ui/button";
import { TrendChart, type TrendPoint } from "@/components/ui/TrendChart";
import { buildGrid, subjectRates, weakestSubject, buildShareText, computeGap, findReference, type GapStatus } from "@/lib/logic";
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
  const { schools, attempts } = useStore();
  const school = schools.find((s) => s.id === schoolId);
  if (!school) {
    nav.goHome();
    return null;
  }

  const grid = buildGrid(school, attempts); // 年度降順
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[22px] font-bold tracking-tight text-neutral-900">
          {school.name}
          {school.sample && <span className="ml-1.5 align-middle text-xs font-medium text-neutral-400">サンプル</span>}
        </h1>
        <Button variant="ghost" size="sm" onClick={() => nav.goSchoolForm(school.id)}>
          学校を編集
        </Button>
      </div>

      {trend.length >= 2 && <TrendChart points={trend} />}

      {anyRate && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
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

      {grid.length > 0 ? (
        <div className="space-y-2.5">
          {grid.map(({ attempt: a, gap: g }) => (
            <AttemptCard key={a.id} school={school} attempt={a} status={g.status} onClick={() => nav.goAttemptForm(school.id, a.id)} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-center text-sm text-neutral-500">
          まだ記録がありません。<br />最初の1回は最低点に届かなくて当たり前。<b>伸び</b>を見るアプリです。
        </div>
      )}

      <div className="grid gap-2.5 pt-1">
        <Button size="block" onClick={() => nav.goAttemptForm(school.id, null)}>
          ＋ 結果を記録
        </Button>
        {grid.length > 0 && (
          <Button variant="ghost" size="block" onClick={share}>
            直近の結果をシェア
          </Button>
        )}
      </div>

      {school.source && (
        <p className="px-1 pt-1 text-[11px] leading-relaxed text-neutral-400">
          合格最低点・平均点は<b>目安</b>です。出典:
          {school.source.url ? (
            <a href={school.source.url} target="_blank" rel="noreferrer" className="underline">{school.source.label}</a>
          ) : (
            school.source.label
          )}
          {school.source.asof && `(${school.source.asof}時点)`}。最新・正確な情報は各校公式でご確認ください。
        </p>
      )}
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
      <button
        type="button"
        onClick={onClick}
        className="block w-full rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm active:scale-[0.99]"
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
      </button>
    );
  }
}
