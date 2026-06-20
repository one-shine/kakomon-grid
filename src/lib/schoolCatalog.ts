// 同梱する「学校データ」カタログ(付加価値の核)。
//
// 【データ方針 — 必ず守る】
// 1. 各校"公式サイトの公表値"を一次情報として集約。出版社・中受メディア(声の教育社・
//    塾ブログ等)が編集した一覧表の丸写し/転載は禁止(編集著作物・DBの著作権/規約)。
//    出典は必ず各校公式の「入試結果/入試データ」ページURL。
// 2. 数値の捏造・推測は厳禁。公式が公表していない数値は載せない(reference を空にする)。
//    合格最低点を公式が出さない学校(麻布・桜蔭・女子学院・雙葉 等)があり、それが事実。
// 3. 合格最低点・受験者平均点は「目安」。UIに免責(最新は各校公式で確認)を必ず表示。
// 4. 学校公式サイトは自動取得(fetch)を弾くため、年度別の数値は一次資料を機械で直接
//    検証できない。**reference の数値は本公開(★)前に各校公式PDFで人手確認し verified=true** に。
//    現状、信頼できる構造(科目・配点・公表有無・公式URL)を提供し、年度別数値は裏が取れた
//    最小限のみ目安として載せる。
import type { Subject, YearStat, SourceRef } from "@/lib/logic";

export interface CatalogSchool {
  id: string;
  name: string;
  subjects: Subject[];
  round?: string;
  reference: YearStat[];
  source: SourceRef;
  /** 合格最低点を公式が公表しているか。false=非公表(数値が無いのが正しい)。 */
  disclosesMinPass?: boolean;
  /** 公式ページで人手の最終確認が済んだら true(本公開の条件)。未確認の数値は false。 */
  verified?: boolean;
  /** 実在校でない説明用データ */
  demo?: boolean;
  note?: string;
}

// 配点(科目・満点)は広く知られた公開情報として比較的安定。年度別数値(reference)は
// 裏取りできた開成・武蔵のみ目安として収録(verified=false)。他校は公式URL＋公表有無を提供。
export const SCHOOL_CATALOG: CatalogSchool[] = [
  // ── 数値あり(目安・要公式確認) ──────────────────────────────
  {
    id: "kaisei",
    name: "開成中学校",
    subjects: [{ name: "国語", max: 85 }, { name: "算数", max: 85 }, { name: "理科", max: 70 }, { name: "社会", max: 70 }],
    round: "一般",
    // 合計310。avg は受験者(全体)平均。
    reference: [
      { year: 2025, round: "", minPass: 202, avg: null },
      { year: 2024, round: "", minPass: 216, avg: 203.8 },
      { year: 2023, round: "", minPass: 237, avg: null },
      { year: 2022, round: "", minPass: 199, avg: null },
    ],
    source: { label: "開成中学校 公式『入試状況・結果』", url: "https://kaiseigakuen.jp/admission/exam/result/", asof: "2026-06" },
    disclosesMinPass: true,
    verified: false,
    note: "合計310点。数値は目安(公式PDFで最終確認)。",
  },
  {
    id: "musashi",
    name: "武蔵中学校",
    subjects: [{ name: "国語", max: 100 }, { name: "算数", max: 100 }, { name: "理科", max: 60 }, { name: "社会", max: 60 }],
    round: "一般",
    // 合計320。avg は受験者平均。
    reference: [
      { year: 2026, round: "", minPass: 173, avg: 161.3 },
      { year: 2025, round: "", minPass: 187, avg: null },
    ],
    source: { label: "武蔵中学校 公式『入試データ』", url: "https://www.musashi.ed.jp/admission/data.html", asof: "2026-06" },
    disclosesMinPass: true,
    verified: false,
    note: "合計320点。武蔵は科目別平均も公式公表。数値は目安。",
  },

  // ── 構造のみ(公式が結果を公表。年度別数値は公式PDFで確定→投入) ──────────
  {
    id: "kaijo",
    name: "海城中学校",
    subjects: [{ name: "国語", max: 120 }, { name: "算数", max: 120 }, { name: "理科", max: 80 }, { name: "社会", max: 80 }],
    round: "第1回",
    reference: [],
    source: { label: "海城中学校 公式『入試結果』", url: "https://www.kaijo.ed.jp/admission/", asof: "2026-06" },
    disclosesMinPass: true,
    verified: false,
    note: "合計400点。科目別平均を公式公表。年度別数値は公式で確認。",
  },
  {
    id: "komaba-toho",
    name: "駒場東邦中学校",
    subjects: [{ name: "国語", max: 120 }, { name: "算数", max: 120 }, { name: "理科", max: 80 }, { name: "社会", max: 80 }],
    round: "一般",
    reference: [],
    source: { label: "駒場東邦中学校 公式『中学入試情報』", url: "https://www.komabajh.toho-u.ac.jp/examination/", asof: "2026-06" },
    verified: false,
    note: "合計400点。年度別数値は公式で確認。",
  },
  {
    id: "toshimagaoka",
    name: "豊島岡女子学園中学校",
    subjects: [{ name: "国語", max: 100 }, { name: "算数", max: 100 }, { name: "理科", max: 50 }, { name: "社会", max: 50 }],
    round: "第1回",
    reference: [],
    source: { label: "豊島岡女子学園中学校 公式『入試結果』", url: "https://www.toshimagaoka.ed.jp/admission/results/", asof: "2026-06" },
    disclosesMinPass: true,
    verified: false,
    note: "合計300点。科目別の受験者/合格者平均を年度別PDFで公式公表。数値は公式で確認。",
  },
  {
    id: "shibuya-makuhari",
    name: "渋谷教育学園幕張中学校",
    subjects: [{ name: "国語", max: 100 }, { name: "算数", max: 100 }, { name: "理科", max: 75 }, { name: "社会", max: 75 }],
    round: "1次",
    reference: [],
    source: { label: "渋谷教育学園幕張中学校 公式『入試結果データ』", url: "https://www.shibumaku.jp/admissions/", asof: "2026-06" },
    disclosesMinPass: true,
    verified: false,
    note: "合計350点。男女別集計の場合あり。年度別数値は公式で確認。",
  },
  {
    id: "shibuya-shibuya",
    name: "渋谷教育学園渋谷中学校",
    subjects: [{ name: "国語", max: 100 }, { name: "算数", max: 100 }, { name: "理科", max: 50 }, { name: "社会", max: 50 }],
    round: "第1回",
    reference: [],
    source: { label: "渋谷教育学園渋谷中学校 公式『募集要項』", url: "https://www.shibushibu.jp/admission/", asof: "2026-06" },
    disclosesMinPass: true,
    verified: false,
    note: "合計300点。男女別集計の場合あり。年度別数値は公式で確認。",
  },

  // ── 合格最低点を公式非公表(reference空が正しい。数値を出さないのが事実) ──────
  {
    id: "azabu",
    name: "麻布中学校",
    subjects: [{ name: "国語", max: 60 }, { name: "算数", max: 60 }, { name: "理科", max: 40 }, { name: "社会", max: 40 }],
    round: "一般",
    reference: [],
    source: { label: "麻布中学校 公式『入試情報』", url: "https://www.azabu-jh.ed.jp/", asof: "2026-06" },
    disclosesMinPass: false,
    verified: false,
    note: "合計200点。合格最低点・平均点は公式非公表。",
  },
  {
    id: "oin",
    name: "桜蔭中学校",
    subjects: [{ name: "国語", max: 100 }, { name: "算数", max: 100 }, { name: "理科", max: 60 }, { name: "社会", max: 60 }],
    round: "一般",
    reference: [],
    source: { label: "桜蔭中学校 公式『入試案内』", url: "https://www.oin.ed.jp/", asof: "2026-06" },
    disclosesMinPass: false,
    verified: false,
    note: "合計320点。合格最低点・平均点は公式非公表。",
  },
  {
    id: "joshi-gakuin",
    name: "女子学院中学校",
    subjects: [{ name: "国語", max: 100 }, { name: "算数", max: 100 }, { name: "理科", max: 100 }, { name: "社会", max: 100 }],
    round: "一般",
    reference: [],
    source: { label: "女子学院中学校 公式『入学試験について』", url: "https://www.joshigakuin.ed.jp/exam/examination/", asof: "2026-06" },
    disclosesMinPass: false,
    verified: false,
    note: "合計400点(4科各100)。合格最低点・平均点は公式非公表。",
  },
  {
    id: "futaba",
    name: "雙葉中学校",
    subjects: [{ name: "国語", max: 100 }, { name: "算数", max: 100 }, { name: "理科", max: 50 }, { name: "社会", max: 50 }],
    round: "一般",
    reference: [],
    source: { label: "雙葉中学校 公式『入学について』", url: "https://www.futabagakuen-jh.ed.jp/", asof: "2026-06" },
    disclosesMinPass: false,
    verified: false,
    note: "合計300点。合格最低点・平均点は公式非公表。",
  },

  // ── デモ(明確に作り物) ──────────────────────────────
  {
    id: "demo-ohka",
    name: "見本中学校(サンプル)",
    demo: true,
    subjects: [{ name: "国語", max: 150 }, { name: "算数", max: 150 }, { name: "理科", max: 100 }, { name: "社会", max: 100 }],
    reference: [
      { year: 2025, round: "①", minPass: 322, avg: 305 },
      { year: 2024, round: "①", minPass: 315, avg: 298 },
      { year: 2023, round: "①", minPass: 318, avg: 301 },
    ],
    source: { label: "見本データ(実在の学校ではありません)", url: "", asof: "2026-06" },
  },
];

export function getCatalogSchool(id: string): CatalogSchool | null {
  return SCHOOL_CATALOG.find((c) => c.id === id) ?? null;
}
