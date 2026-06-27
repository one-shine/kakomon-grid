// 過去問グリッド 純粋ロジック(DOM/storage非依存=テスト可能)。
// vanilla版(apps/kakomon-grid/logic.js, テスト49本)を TypeScript(strict) へ移植。
// 親が入力する得点のみを扱い、子どもの個人情報は持たない。

export interface Subject {
  name: string;
  max: number;
}

// 出典(同梱データは必ず一次情報の出所と取得日を持つ。丸写し防止・景表法対策)。
export interface SourceRef {
  label: string; // 例:「○○中学校 公式サイト 入試結果」
  url: string;
  asof: string; // 取得日 YYYY-MM
}

// 年度別の参考値(合格最低点・受験者平均点)。あくまで「目安」。
export interface YearStat {
  year: number;
  round?: string;
  minPass?: number | null;
  avg?: number | null;
}

// 「やる過去問」1コマ(年度×回)。計画→消化→記録を回すための予定単位。
export interface PlanSlot {
  year: number;
  round: string;
}

export interface School {
  id: string;
  name: string;
  sample?: boolean;
  subjects: Subject[];
  // やる過去問の計画(年度×回のコマ)。記録するとそのコマが「済」になる。
  plan?: PlanSlot[];
  // 入試日(任意・YYYY-MM-DD)。残り日数とペースの逆算に使う。
  examDate?: string;
  // 週の学習時間割(7日×3コマの科目ラベル)。過去問の弱点から自動提案し親が微調整する。
  timetable?: string[][];
  // 同梱の学校データから取り込んだ参考情報(任意)。手入力校では undefined。
  reference?: YearStat[];
  source?: SourceRef;
}

export interface Attempt {
  id: string;
  schoolId: string;
  year: number;
  round: string;
  date?: string;
  scores: Record<string, number | null>;
  minPass: number | null;
  memo: string;
  // 解き直し(間違い直し)済みか。やりっぱなし防止＝努力の最小入力(1タップ)。
  reviewed?: boolean;
  sample?: boolean;
}

export interface AppState {
  version: 1;
  schools: School[];
  attempts: Attempt[];
}

export type GapStatus = "PASS" | "NEAR" | "BELOW" | "NO_LINE";

export interface GapInfo {
  total: number;
  maxTotal: number;
  minPass: number | null;
  gap: number | null;
  status: GapStatus;
}

export interface SubjectRate {
  name: string;
  max: number;
  rate: number | null;
  count: number;
}

export interface GridRow {
  attempt: Attempt;
  gap: GapInfo;
}

export interface SubjectPreset {
  id: string;
  label: string;
  subjects: Subject[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function uuid(): string {
  return (
    "xxxxxxxx-4xxx".replace(/x/g, () => ((Math.random() * 16) | 0).toString(16)) +
    "-" +
    Date.now().toString(36)
  );
}

export const SUBJECT_PRESETS: SubjectPreset[] = [
  {
    id: "yon-150",
    label: "4科(国算150・理社100)",
    subjects: [
      { name: "国語", max: 150 },
      { name: "算数", max: 150 },
      { name: "理科", max: 100 },
      { name: "社会", max: 100 },
    ],
  },
  {
    id: "yon-100",
    label: "4科(各100点)",
    subjects: [
      { name: "国語", max: 100 },
      { name: "算数", max: 100 },
      { name: "理科", max: 100 },
      { name: "社会", max: 100 },
    ],
  },
  {
    id: "ni-100",
    label: "2科(国算)",
    subjects: [
      { name: "国語", max: 100 },
      { name: "算数", max: 100 },
    ],
  },
];

function isFilled(v: number | null | undefined | string): boolean {
  return v === 0 || (v != null && v !== "");
}

export function attemptTotal(
  school: School,
  attempt: Pick<Attempt, "scores">,
): { total: number; maxTotal: number; filled: number } {
  let total = 0;
  let maxTotal = 0;
  let filled = 0;
  for (const sub of school.subjects ?? []) {
    const v = attempt.scores ? attempt.scores[sub.name] : null;
    if (isFilled(v)) {
      total += Number(v) || 0;
      maxTotal += Number(sub.max) || 0;
      filled++;
    }
  }
  return { total, maxTotal, filled };
}

export function computeGap(
  school: School,
  attempt: Pick<Attempt, "scores" | "minPass">,
): GapInfo {
  const t = attemptTotal(school, attempt);
  const minPass = isFilled(attempt.minPass) ? Number(attempt.minPass) : null;
  if (minPass == null) {
    return { total: t.total, maxTotal: t.maxTotal, minPass: null, gap: null, status: "NO_LINE" };
  }
  const gap = t.total - minPass;
  let status: GapStatus;
  if (gap >= 0) status = "PASS";
  else if (t.maxTotal > 0 && -gap <= t.maxTotal * 0.05) status = "NEAR";
  else status = "BELOW";
  return { total: t.total, maxTotal: t.maxTotal, minPass, gap, status };
}

// 1セル分の得点率(%)。未入力・満点0は null。グリッド表で科目セルを色分けするのに使う。
export function scoreRate(score: number | null | undefined, max: number): number | null {
  if (!isFilled(score) || !(Number(max) > 0)) return null;
  return Math.round((Number(score) / Number(max)) * 100);
}

// 合計の得点率(%)。満点が学校・年度で違うので、横比較は生点でなく率で見る。
export function totalRate(g: Pick<GapInfo, "total" | "maxTotal">): number | null {
  return g.maxTotal > 0 ? Math.round((g.total / g.maxTotal) * 100) : null;
}

export function subjectRates(school: School, attempts: Attempt[]): SubjectRate[] {  return (school.subjects ?? []).map((sub) => {
    let sum = 0;
    let cnt = 0;
    for (const a of attempts ?? []) {
      if (a.schoolId !== school.id) continue;
      const v = a.scores ? a.scores[sub.name] : null;
      if (isFilled(v)) {
        sum += (Number(v) || 0) / (Number(sub.max) || 1);
        cnt++;
      }
    }
    return { name: sub.name, max: sub.max, rate: cnt ? Math.round((sum / cnt) * 100) : null, count: cnt };
  });
}

export function weakestSubject(school: School, attempts: Attempt[]): SubjectRate | null {
  const rates = subjectRates(school, attempts).filter((r): r is SubjectRate & { rate: number } => r.rate != null);
  if (!rates.length) return null;
  return rates.reduce((min, r) => (r.rate < min.rate ? r : min));
}

export function buildGrid(school: School, attempts: Attempt[]): GridRow[] {
  const rows = (attempts ?? [])
    .filter((a) => a.schoolId === school.id)
    .slice()
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const ra = a.round || "";
      const rb = b.round || "";
      return ra < rb ? -1 : ra > rb ? 1 : 0;
    });
  return rows.map((a) => ({ attempt: a, gap: computeGap(school, a) }));
}

export function latestGap(school: School, attempts: Attempt[]): GapInfo | null {
  const grid = buildGrid(school, attempts);
  return grid.length ? grid[0].gap : null;
}

// ───────────────────────────────────────────────────────────
// 過去問プラン(計画→消化→記録)。やる予定のコマ(plan)と記録済(attempts)を1枚に統合する。
export interface PlanRow {
  year: number;
  round: string;
  attempt: Attempt | null; // 済ならその記録
  done: boolean; // 1科目以上入力済か
  gap: GapInfo | null;
}

const slotKey = (year: number, round: string) => `${year}|${round || ""}`;

// 予定コマと記録を年度降順で統合。同じ年度×回は記録(済)で上書き。
export function buildPlanRows(school: School, attempts: Attempt[]): PlanRow[] {
  const map = new Map<string, PlanRow>();
  for (const p of school.plan ?? []) {
    map.set(slotKey(p.year, p.round), { year: p.year, round: p.round || "", attempt: null, done: false, gap: null });
  }
  for (const a of attempts) {
    if (a.schoolId !== school.id) continue;
    const filled = attemptTotal(school, a).filled > 0;
    map.set(slotKey(a.year, a.round), { year: a.year, round: a.round || "", attempt: a, done: filled, gap: computeGap(school, a) });
  }
  return [...map.values()].sort((x, y) =>
    y.year !== x.year ? y.year - x.year : (x.round || "") < (y.round || "") ? -1 : (x.round || "") > (y.round || "") ? 1 : 0,
  );
}

// 消化状況(済 / 全コマ)。グリッドを「計画の進捗」として読ませる中核指標。
export function planProgress(school: School, attempts: Attempt[]): { done: number; total: number; rate: number } {
  const rows = buildPlanRows(school, attempts);
  const total = rows.length;
  const done = rows.filter((r) => r.done).length;
  return { done, total, rate: total ? Math.round((done / total) * 100) : 0 };
}

// 「直近N年×回なし」の予定コマを提案(学校追加時の初期プラン用)。baseYear は呼び出し側で渡す。
export function suggestPlan(baseYear: number, count = 3): PlanSlot[] {
  const out: PlanSlot[] = [];
  for (let i = 0; i < count; i++) out.push({ year: baseYear - i, round: "" });
  return out;
}

// ───────────────────────────────────────────────────────────
// 入試日からの逆算ペース(スケジュールの背骨)。todayISO は呼び出し側で渡す(テスト可)。
export function daysUntil(dateISO: string | undefined, todayISO: string): number | null {
  if (!dateISO) return null;
  const d = Date.parse(`${dateISO}T00:00:00`);
  const t = Date.parse(`${todayISO}T00:00:00`);
  if (Number.isNaN(d) || Number.isNaN(t)) return null;
  return Math.round((d - t) / 86400000);
}

export interface Pace {
  daysLeft: number | null; // 入試日までの残り日数(過ぎていたら負)
  remain: number; // 未消化コマ数
  daysPerSlot: number | null; // 1コマあたり何日のペースか
  tight: boolean; // ペースが厳しい(残コマに対し日数が少ない)
}

export function buildPace(school: School, attempts: Attempt[], todayISO: string): Pace {
  const prog = planProgress(school, attempts);
  const remain = prog.total - prog.done;
  const daysLeft = daysUntil(school.examDate, todayISO);
  const daysPerSlot = daysLeft != null && daysLeft > 0 && remain > 0 ? Math.floor(daysLeft / remain) : null;
  const tight = daysPerSlot != null && daysPerSlot < 5;
  return { daysLeft, remain, daysPerSlot, tight };
}

// 解き直しの進捗(済コマのうち直し済みの数)。やりっぱなし防止の指標。
export function reviewProgress(school: School, attempts: Attempt[]): { reviewed: number; done: number } {
  const rows = buildPlanRows(school, attempts).filter((r) => r.done);
  return { reviewed: rows.filter((r) => r.attempt?.reviewed).length, done: rows.length };
}

// 「効いているか」=努力が点に変わっているかの手応え。因果でなく事実の並置(n小では出さない)。
export type EffectTrend = "up" | "flat" | "down" | "none";
export interface Effect {
  rise: number | null; // 初回→直近の合計得点率の変化(pt)
  trend: EffectTrend;
  reviewed: number;
  done: number;
}

export function buildEffect(school: School, attempts: Attempt[]): Effect {
  const grid = buildGrid(school, attempts); // 年度降順
  const chrono = grid.slice().reverse();
  const first = chrono.length ? totalRate(chrono[0].gap) : null;
  const last = grid.length ? totalRate(grid[0].gap) : null;
  const rise = chrono.length >= 2 && first != null && last != null ? last - first : null;
  const rp = reviewProgress(school, attempts);
  const trend: EffectTrend = rise == null ? "none" : rise > 2 ? "up" : rise < -2 ? "down" : "flat";
  return { rise, trend, reviewed: rp.reviewed, done: rp.done };
}

// ───────────────────────────────────────────────────────────
// 「今週やること」=既存データから次の具体行動を1〜3件提示(スタサプのミッションの思想)。
// 新規入力ゼロ・過去問軸を強める。優先:やりっぱなし防止(直し)→次の過去問→弱点重点。
export interface TodoItem {
  kind: "review" | "kakomon" | "weak";
  text: string;
  attemptId?: string; // review:この記録を開く
  year?: number; // kakomon:この年度を記録(prefill)
  round?: string;
}

export function buildWeeklyTodo(school: School, attempts: Attempt[]): TodoItem[] {
  const items: TodoItem[] = [];
  const rows = buildPlanRows(school, attempts); // 年度降順

  // 1. 解き直しが残っている記録(やりっぱなし防止=最優先)。直近のものから。
  const unreviewed = rows.find((r) => r.done && r.attempt && !r.attempt.reviewed);
  if (unreviewed?.attempt) {
    items.push({ kind: "review", text: `${unreviewed.year}年度${unreviewed.round}の解き直しをやろう`, attemptId: unreviewed.attempt.id });
  }

  // 2. 次にやる過去問(未消化のうち古い年度から)
  const todo = rows.filter((r) => !r.done).sort((a, b) => a.year - b.year || (a.round < b.round ? -1 : 1));
  if (todo.length) {
    const r = todo[0];
    items.push({ kind: "kakomon", text: `過去問 ${r.year}${r.round} を解こう`, year: r.year, round: r.round });
  }

  // 3. 弱点科目を重点に
  const weak = weakestSubject(school, attempts);
  if (weak && weak.rate != null) {
    items.push({ kind: "weak", text: `弱点の${weak.name}(平均${weak.rate}%)を重点に` });
  }

  return items.slice(0, 3);
}

// ───────────────────────────────────────────────────────────
// 週の学習時間割。過去問の弱点から「何を・いつやるか」を自動提案し、親がタップで微調整する。
// = 過去問の結果→学習計画(成果軸の上の差別化)。毎日入力は不要(提案ベース)。
export const WEEK_DAYS = ["月", "火", "水", "木", "金", "土", "日"];
// 時間軸カレンダー:7:00〜22:00 を1時間枠で(15枠/日)。Outlook風に実時刻で予定を置く。
export const TT_HOURS = Array.from({ length: 15 }, (_, i) => 7 + i); // 7,8,…,21
export const SCHOOL_LABEL = "学校";
export const CRAM_LABEL = "塾";
export const KAKOMON_LABEL = "過去問";
// 時間割の過去問は「過去問 2023①」のように特定年度を持つ。判定は接頭辞で行う。
export function isKakomon(v: string): boolean {
  return v.startsWith(KAKOMON_LABEL);
}
export function kakomonLabel(year: number, round: string): string {
  return `${KAKOMON_LABEL} ${year}${round || ""}`;
}

export function emptyTimetable(): string[][] {
  return WEEK_DAYS.map(() => TT_HOURS.map(() => ""));
}
// 平日 8:00〜15:00 を学校で初期化したカレンダー(よくある前提を最初から入れて手間を減らす)。
export function defaultTimetable(): string[][] {
  return WEEK_DAYS.map((_, d) => TT_HOURS.map((h) => (d < 5 && h >= 8 && h <= 14 ? SCHOOL_LABEL : "")));
}

function isStudyLabel(v: string): boolean {
  return v !== "" && v !== SCHOOL_LABEL && v !== CRAM_LABEL;
}

// 週の学習量サマリ(時間)。学習(科目＋過去問)と塾の合計枠数=時間の目安。
export function planSummary(school: School): { studyHours: number; cramHours: number } {
  const g = school.timetable;
  if (!g) return { studyHours: 0, cramHours: 0 };
  let s = 0;
  let c = 0;
  g.forEach((row) => row?.forEach((v) => (v === CRAM_LABEL ? c++ : isStudyLabel(v) ? s++ : null)));
  return { studyHours: s, cramHours: c };
}

// 過去問の弱点で重みづけし、学校・塾を除いた実時刻に学習を配置。過去問は週末午前に塊で。
// base の学校・塾は保持し、空き時間だけを埋める=隙間時間の管理。
export function suggestTimetable(school: School, attempts: Attempt[], base?: string[][]): string[][] {
  const subjects = (school.subjects ?? []).map((s) => s.name);
  const grid: string[][] = WEEK_DAYS.map((_, d) =>
    TT_HOURS.map((_, hi) => {
      const v = base?.[d]?.[hi];
      return v === SCHOOL_LABEL || v === CRAM_LABEL ? v : "";
    }),
  );
  if (!subjects.length) return grid;

  const rates = subjectRates(school, attempts);
  const weight = (name: string): number => {
    const r = rates.find((x) => x.name === name)?.rate;
    return r == null ? 50 : Math.max(8, 100 - r);
  };
  const idxOf = (h: number) => TT_HOURS.indexOf(h);

  // 過去問:特定年度(計画の未消化)を週末午前 9〜12 に塊で置く。古い年度から、週に最大2本。
  const todo = buildPlanRows(school, attempts)
    .filter((r) => !r.done)
    .sort((a, b) => a.year - b.year || (a.round < b.round ? -1 : 1))
    .map((r) => kakomonLabel(r.year, r.round));
  let ti = 0;
  for (const [d, hrs] of [[5, [9, 10, 11]], [6, [9, 10, 11]]] as [number, number[]][]) {
    if (ti >= Math.min(todo.length, 2)) break;
    const his = hrs.map(idxOf);
    if (his.every((hi) => grid[d][hi] === "")) {
      his.forEach((hi) => (grid[d][hi] = todo[ti]));
      ti++;
    }
  }

  // 学習枠:平日は夕方 16〜(3コマ)、週末は午後中心 12〜(5コマ)。空き時刻のみ。
  const studySlots: [number, number][] = [];
  for (let d = 0; d < WEEK_DAYS.length; d++) {
    const weekend = d >= 5;
    const target = weekend ? 5 : 3;
    const start = weekend ? 12 : 16;
    const end = weekend ? 20 : 21;
    let cnt = 0;
    for (let h = start; h <= end && cnt < target; h++) {
      const hi = idxOf(h);
      if (hi >= 0 && grid[d][hi] === "") {
        studySlots.push([d, hi]);
        cnt++;
      }
    }
  }

  const cells = studySlots.length;
  const need: Record<string, number> = {};
  const wsum = subjects.reduce((a, s) => a + weight(s), 0) || 1;
  let assigned = 0;
  for (const s of subjects) {
    need[s] = Math.round((cells * weight(s)) / wsum);
    assigned += need[s];
  }
  const weakestFirst = [...subjects].sort((a, b) => weight(b) - weight(a));
  let diff = cells - assigned;
  for (let i = 0; diff !== 0 && i < weakestFirst.length * 4; i++) {
    const s = weakestFirst[i % weakestFirst.length];
    if (diff > 0) (need[s]++, diff--);
    else if (need[s] > 0) (need[s]--, diff++);
  }
  const labels: string[] = [];
  for (let i = 0; i < cells; i++) {
    let best = subjects[0];
    let bestv = -1;
    for (const s of subjects) if ((need[s] ?? 0) > bestv) (bestv = need[s] ?? 0), (best = s);
    if (bestv <= 0) break;
    labels.push(best);
    need[best]--;
  }
  while (labels.length < cells) labels.push(subjects[0]);
  studySlots.forEach(([d, hi], i) => (grid[d][hi] = labels[i] ?? ""));
  return grid;
}

// 同梱データの参考値から、その年度・回に当たる合格最低点/平均点を引く(目安)。
export function findReference(school: School, year: number, round: string): YearStat | null {
  const refs = school.reference ?? [];
  if (!refs.length) return null;
  const r = String(round || "");
  // 年度・回が一致するものを優先。回が空なら年度一致で代用。
  return (
    refs.find((x) => x.year === year && String(x.round || "") === r) ??
    refs.find((x) => x.year === year) ??
    null
  );
}

// ───────────────────────────────────────────────────────────
// 指針(guidance):記録した得点から「射程圏か・あと何点・どの科目で・伸びているか・次の一手」を返す。
// 可視化で終わらせず親の判断と不安軽減につなげる中核(価値=記録→指針)。すべて「目安」。
export type GuidanceTone = "good" | "warn" | "hard" | "info";
export interface Guidance {
  tone: GuidanceTone;
  headline: string; // 一言の見立て
  detail: string; // あと何点 等の具体
  lever?: string; // どの科目をどれだけ上げれば届くか
  encouragement?: string; // 自分の伸びに基づく励まし
  nextAction: string; // 次の一手(短文)
}

export function buildGuidance(school: School, attempts: Attempt[]): Guidance {
  const grid = buildGrid(school, attempts); // 年度降順
  const prog = planProgress(school, attempts);
  if (!grid.length) {
    return {
      tone: "info",
      headline: prog.total > 0 ? `やる過去問が${prog.total}コマ。まず1年分を記録しよう` : "まず1年分を記録しよう",
      detail: "過去問の得点を入れると、合格最低点との距離と「伸び」が見えます。",
      nextAction: "結果を記録する",
    };
  }
  const remain = prog.total - prog.done;
  const latest = grid[0].gap;

  // 伸び:時系列(古い→新しい)の合計得点率の変化
  const chrono = grid.slice().reverse();
  const firstRate = totalRate(chrono[0].gap);
  const lastRate = totalRate(latest);
  const riseRate =
    chrono.length >= 2 && firstRate != null && lastRate != null ? lastRate - firstRate : null;
  const encouragement =
    riseRate != null && riseRate > 0
      ? `初回から得点率 +${riseRate}pt。伸びは出ている。`
      : riseRate != null && riseRate < 0
        ? `直近は得点率 ${riseRate}pt。波がある時期。`
        : undefined;

  const weak = weakestSubject(school, attempts);

  if (latest.minPass == null || latest.gap == null) {
    return {
      tone: "info",
      headline: "合格最低点を入れると「あと何点」が分かる",
      detail: "この年度の合格最低点(目安でも可)を入れると、射程圏か・あと何点かを判定します。",
      ...(encouragement ? { encouragement } : {}),
      nextAction: "合格最低点を追記する",
    };
  }

  // lever:弱点科目で差を埋める道筋(目安)
  let lever: string | undefined;
  if (weak && weak.rate != null && latest.gap < 0) {
    const need = -latest.gap;
    const target = Math.min(100, weak.rate + Math.ceil((need / weak.max) * 100));
    const pts = Math.round(((target - weak.rate) / 100) * weak.max);
    lever =
      target > weak.rate && pts > 0
        ? `弱点の${weak.name}(平均${weak.rate}%)を${target}%まで上げると約+${pts}点。${pts >= need ? "射程圏に入る。" : "差を縮められる。"}`
        : `弱点は${weak.name}(平均${weak.rate}%)。複数科目で底上げを。`;
  } else if (weak && weak.rate != null) {
    lever = `弱点の${weak.name}(平均${weak.rate}%)を固めると合格圏が安定する。`;
  }
  const next = remain > 0 ? `${weak ? `${weak.name}を重点に、` : ""}残り${remain}コマを進める` : weak ? `${weak.name}を重点に、もう1年分` : "もう1年分を記録";

  if (latest.status === "PASS") {
    return {
      tone: "good",
      headline: "合格圏。この調子を維持",
      detail: `合格最低点を +${latest.gap}点 上回っている。`,
      ...(lever ? { lever } : {}),
      ...(encouragement ? { encouragement } : {}),
      nextAction: weak ? `${weak.name}を固めて安定させる` : "他の年度でも試す",
    };
  }
  if (latest.status === "NEAR") {
    return {
      tone: "warn",
      headline: "あと一歩で射程圏",
      detail: `合格最低点まで あと${-latest.gap}点。`,
      ...(lever ? { lever } : {}),
      ...(encouragement ? { encouragement } : {}),
      nextAction: next,
    };
  }
  // BELOW
  const rising = riseRate != null && riseRate > 0;
  return {
    tone: rising ? "warn" : "hard",
    headline: rising ? "まだ届かないが、伸びは出ている" : "重点配分で差を詰める",
    detail: `合格最低点まで あと${-latest.gap}点。${rising ? "焦らず積み上げを。" : ""}`.trim(),
    ...(lever ? { lever } : {}),
    ...(encouragement ? { encouragement } : {}),
    nextAction: next,
  };
}

export function buildShareText(school: School, attempt: Attempt, gapInfo: GapInfo): string {
  const label = attempt.year + "年度" + (attempt.round ? attempt.round : "");
  let base = "過去問 " + school.name + " " + label + ": " + gapInfo.total + "/" + gapInfo.maxTotal;
  if (gapInfo.minPass != null && gapInfo.gap != null) {
    const sign = gapInfo.gap >= 0 ? "+" : "";
    base += "(合格最低点" + sign + gapInfo.gap + ")";
  }
  return base + " #中学受験";
}

export function validateAttempt(
  school: School,
  attempt: { year: number | string; scores: Record<string, number | null>; minPass?: number | null | string },
): ValidationResult {
  const errors: string[] = [];
  const y = Number(attempt.year);
  if (!(y >= 1990 && y <= 2099)) errors.push("年度は1990〜2099で入力してください");
  let anyScore = false;
  for (const sub of school.subjects ?? []) {
    const v = attempt.scores ? attempt.scores[sub.name] : null;
    if (isFilled(v)) {
      anyScore = true;
      const n = Number(v);
      if (!(n >= 0 && n <= sub.max)) errors.push(sub.name + "は0〜" + sub.max + "で入力してください");
    }
  }
  if (!anyScore) errors.push("得点を1科目以上入力してください");
  if (attempt.minPass !== "" && attempt.minPass != null) {
    const mp = Number(attempt.minPass);
    if (!(mp >= 0 && mp <= 1000)) errors.push("合格最低点は0〜1000で入力してください");
  }
  return { ok: errors.length === 0, errors };
}

export function validateSchool(school: { name: string; subjects: Subject[] }): ValidationResult {
  const errors: string[] = [];
  if (!school.name || !String(school.name).trim()) errors.push("学校名を入力してください");
  const subs = school.subjects ?? [];
  if (!subs.length) errors.push("科目を1つ以上設定してください");
  for (const s of subs) {
    if (!s.name || !String(s.name).trim()) errors.push("科目名が空です");
    if (!(Number(s.max) > 0 && Number(s.max) <= 500)) errors.push((s.name || "科目") + "の満点は1〜500で設定してください");
  }
  return { ok: errors.length === 0, errors };
}

export function migrateState(raw: unknown): AppState {
  const st = (raw && typeof raw === "object" ? raw : {}) as Partial<AppState>;
  let schools = Array.isArray(st.schools) ? st.schools : [];
  let attempts = Array.isArray(st.attempts) ? st.attempts : [];
  schools = schools
    .filter((s): s is School => !!s && !!s.id && !!s.name)
    .map((s) => ({
      id: s.id,
      name: String(s.name),
      sample: !!s.sample,
      subjects: (Array.isArray(s.subjects) ? s.subjects : [])
        .filter((x) => x && x.name)
        .map((x) => ({ name: String(x.name), max: Number(x.max) || 100 })),
      ...(Array.isArray(s.plan) && s.plan.length
        ? {
            plan: s.plan
              .filter((p): p is PlanSlot => !!p && Number.isFinite(Number(p.year)))
              .map((p) => ({ year: Number(p.year), round: p.round ? String(p.round) : "" })),
          }
        : {}),
      ...(s.examDate ? { examDate: String(s.examDate) } : {}),
      ...(Array.isArray(s.timetable) && s.timetable.length === WEEK_DAYS.length
        ? {
            timetable: s.timetable.map((row) =>
              TT_HOURS.map((_, b) => (Array.isArray(row) && row[b] != null ? String(row[b]) : "")),
            ),
          }
        : {}),
      ...(Array.isArray(s.reference) && s.reference.length
        ? {
            reference: s.reference
              .filter((r): r is YearStat => !!r && Number.isFinite(Number(r.year)))
              .map((r) => ({
                year: Number(r.year),
                round: r.round ? String(r.round) : "",
                minPass: isFilled(r.minPass) ? Number(r.minPass) : null,
                avg: isFilled(r.avg) ? Number(r.avg) : null,
              })),
          }
        : {}),
      ...(s.source && s.source.label && s.source.url
        ? { source: { label: String(s.source.label), url: String(s.source.url), asof: String(s.source.asof || "") } }
        : {}),
    }));
  const validIds: Record<string, boolean> = {};
  schools.forEach((s) => (validIds[s.id] = true));
  attempts = attempts
    .filter((a): a is Attempt => !!a && !!a.id && !!validIds[a.schoolId])
    .map((a) => ({
      id: a.id,
      schoolId: a.schoolId,
      year: Number(a.year) || 0,
      round: a.round ? String(a.round) : "",
      date: a.date || "",
      scores: a.scores && typeof a.scores === "object" ? a.scores : {},
      minPass: isFilled(a.minPass) ? Number(a.minPass) : null,
      memo: a.memo ? String(a.memo) : "",
      ...(a.reviewed ? { reviewed: true } : {}),
      sample: !!a.sample,
    }));
  return { version: 1, schools, attempts };
}
