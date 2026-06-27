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

export interface School {
  id: string;
  name: string;
  sample?: boolean;
  subjects: Subject[];
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
      sample: !!a.sample,
    }));
  return { version: 1, schools, attempts };
}
