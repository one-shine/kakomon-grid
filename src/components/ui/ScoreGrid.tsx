import { buildGrid, scoreRate, totalRate, findReference, type School, type Attempt } from "@/lib/logic";

// 年度×教科の一覧グリッド(表)。アプリ名の核=横に並べて穴を探す/印刷して持ち出す。
// 各科目セルは得点率で色分けし、合計・得点率・最低点差まで1行で見渡せる。

function rateBg(rate: number | null): string {
  if (rate == null) return "text-neutral-300";
  if (rate >= 70) return "bg-emerald-50 text-emerald-700";
  if (rate >= 50) return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}
function gapColor(gap: number | null): string {
  if (gap == null) return "text-neutral-400";
  return gap >= 0 ? "text-emerald-600" : "text-rose-600";
}

export function ScoreGrid({ school, attempts, onPick }: { school: School; attempts: Attempt[]; onPick?: (a: Attempt) => void }) {
  const rows = buildGrid(school, attempts); // 年度降順
  if (!rows.length) return null;

  const th = "px-2.5 py-2 text-center text-[11px] font-semibold text-neutral-500 whitespace-nowrap";
  const td = "px-2.5 py-2 text-center text-sm whitespace-nowrap nums";

  return (
    <div className="score-grid-wrap overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th className={`${th} sticky left-0 z-10 bg-card text-left`}>年度</th>
            {school.subjects.map((s) => (
              <th key={s.name} className={th}>
                {s.name}
                <span className="block text-[10px] font-normal text-neutral-400">/{s.max}</span>
              </th>
            ))}
            <th className={th}>合計</th>
            <th className={th}>得点率</th>
            <th className={th}>最低点差</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ attempt: a, gap: g }) => {
            const tr = totalRate(g);
            const ref = findReference(school, a.year, a.round);
            return (
              <tr
                key={a.id}
                className="border-b border-neutral-100 last:border-0 active:bg-neutral-50"
                onClick={onPick ? () => onPick(a) : undefined}
                style={onPick ? { cursor: "pointer" } : undefined}
              >
                <th scope="row" className={`${td} sticky left-0 z-10 bg-card text-left font-bold text-neutral-800`}>
                  {String(a.year).slice(2)}
                  <span className="text-xs font-normal text-neutral-400">{a.round}</span>
                </th>
                {school.subjects.map((s) => {
                  const v = a.scores[s.name];
                  const r = scoreRate(v, s.max);
                  return (
                    <td key={s.name} className={`${td} ${rateBg(r)}`}>
                      {v == null || v === undefined ? "—" : v}
                      {r != null && <span className="block text-[10px] opacity-70">{r}%</span>}
                    </td>
                  );
                })}
                <td className={`${td} font-bold text-neutral-900`}>
                  {g.total}
                  <span className="block text-[10px] font-normal text-neutral-400">/{g.maxTotal}</span>
                </td>
                <td className={`${td} font-semibold text-neutral-700`}>{tr != null ? `${tr}%` : "—"}</td>
                <td className={`${td} font-extrabold ${gapColor(g.gap)}`}>
                  {g.gap != null ? `${g.gap >= 0 ? "+" : ""}${g.gap}` : "—"}
                  {ref?.minPass != null && <span className="block text-[10px] font-normal text-neutral-400">最低{ref.minPass}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
