import { describe, it, expect } from "vitest";
import * as L from "./logic";
import type { School, Attempt } from "./logic";

const school4: School = {
  id: "sc1",
  name: "桜花中",
  subjects: [
    { name: "国語", max: 150 },
    { name: "算数", max: 150 },
    { name: "理科", max: 100 },
    { name: "社会", max: 100 },
  ],
};
const school2: School = {
  id: "sc2",
  name: "光中",
  subjects: [
    { name: "国語", max: 100 },
    { name: "算数", max: 100 },
  ],
};

const at1: Attempt = { id: "a1", schoolId: "sc1", year: 2025, round: "", scores: { 国語: 100, 算数: 120, 理科: 60, 社会: 70 }, minPass: 320, memo: "" };

describe("attemptTotal", () => {
  it("4科合算", () => expect(L.attemptTotal(school4, at1)).toEqual({ total: 350, maxTotal: 500, filled: 4 }));
  it("未入力科目は満点からも除外", () =>
    expect(L.attemptTotal(school4, { scores: { 国語: 90, 算数: 110 } })).toEqual({ total: 200, maxTotal: 300, filled: 2 }));
  it("0点は入力扱い", () =>
    expect(L.attemptTotal(school4, { scores: { 国語: 0, 算数: 100 } })).toEqual({ total: 100, maxTotal: 300, filled: 2 }));
  it("空文字は未入力", () =>
    expect(L.attemptTotal(school4, { scores: { 国語: null, 算数: 100 } }).filled).toBe(1));
});

describe("computeGap", () => {
  it("正の乖離=PASS", () => {
    const g = L.computeGap(school4, at1);
    expect(g.gap).toBe(30);
    expect(g.status).toBe("PASS");
  });
  it("不足5%以内=NEAR", () => {
    const atNear = { scores: { 国語: 100, 算数: 100, 理科: 50, 社会: 50 }, minPass: 320 };
    expect(L.computeGap(school4, atNear).status).toBe("NEAR"); // 300-320=-20, 20<=25
  });
  it("大幅不足=BELOW", () => {
    const atLow = { scores: { 国語: 80, 算数: 80, 理科: 40, 社会: 40 }, minPass: 320 };
    expect(L.computeGap(school4, atLow).status).toBe("BELOW");
  });
  it("最低点なし=NO_LINE", () => {
    const g = L.computeGap(school4, { scores: { 国語: 90, 算数: 110 }, minPass: null });
    expect(g.status).toBe("NO_LINE");
    expect(g.gap).toBe(null);
  });
  it("最低点0は有効でPASS", () =>
    expect(L.computeGap(school2, { scores: { 国語: 10, 算数: 10 }, minPass: 0 }).status).toBe("PASS"));
  it("ぴったりはPASS", () =>
    expect(L.computeGap(school2, { scores: { 国語: 60, 算数: 60 }, minPass: 120 }).status).toBe("PASS"));
});

describe("scoreRate / totalRate", () => {
  it("1セルの得点率を四捨五入", () => expect(L.scoreRate(120, 150)).toBe(80));
  it("0点は0%(入力扱い)", () => expect(L.scoreRate(0, 100)).toBe(0));
  it("未入力・満点0は null", () => {
    expect(L.scoreRate(null, 100)).toBeNull();
    expect(L.scoreRate(50, 0)).toBeNull();
  });
  it("合計の得点率", () => expect(L.totalRate({ total: 350, maxTotal: 500 })).toBe(70));
  it("満点0は null", () => expect(L.totalRate({ total: 0, maxTotal: 0 })).toBeNull());
});

describe("subjectRates / weakestSubject", () => {
  const attempts: Attempt[] = [
    at1,
    { id: "a2", schoolId: "sc1", year: 2024, round: "", scores: { 国語: 90, 算数: 110 }, minPass: null, memo: "" },
    { id: "a3", schoolId: "sc1", year: 2023, round: "", scores: { 国語: 120, 算数: 90, 理科: 80, 社会: 90 }, minPass: 310, memo: "" },
    { id: "ax", schoolId: "sc2", year: 2025, round: "", scores: { 国語: 50, 算数: 90 }, minPass: 130, memo: "" },
  ];
  const rates = L.subjectRates(school4, attempts);
  it("学校の科目順", () => expect(rates[0].name).toBe("国語"));
  it("国語69%(3回)", () => {
    expect(rates[0].rate).toBe(69);
    expect(rates[0].count).toBe(3);
  });
  it("理科70%(未入力回は除外・2回)", () => {
    expect(rates[2].rate).toBe(70);
    expect(rates[2].count).toBe(2);
  });
  it("弱点=最低率の科目", () => expect(L.weakestSubject(school4, attempts)?.name).toBe("国語"));
  it("試行なしはnull", () =>
    expect(L.weakestSubject({ id: "scX", name: "X", subjects: [{ name: "国語", max: 100 }] }, attempts)).toBe(null));
});

describe("buildGrid / latestGap", () => {
  const many: Attempt[] = [
    { id: "b1", schoolId: "sc2", year: 2023, round: "", scores: { 国語: 50, 算数: 50 }, minPass: 110, memo: "" },
    { id: "b2", schoolId: "sc2", year: 2025, round: "②", scores: { 国語: 70, 算数: 70 }, minPass: 130, memo: "" },
    { id: "b3", schoolId: "sc2", year: 2025, round: "①", scores: { 国語: 60, 算数: 60 }, minPass: 125, memo: "" },
    { id: "b4", schoolId: "sc1", year: 2024, round: "", scores: { 国語: 100 }, minPass: null, memo: "" },
  ];
  const grid = L.buildGrid(school2, many);
  it("自校のみ3行", () => expect(grid.length).toBe(3));
  it("年度降順・同年度は回昇順", () => expect(grid.map((r) => r.attempt.id)).toEqual(["b3", "b2", "b1"]));
  it("各行に乖離付き", () => expect(grid[0].gap.status).toBeTruthy());
  it("直近乖離=最新年度の先頭", () => expect(L.latestGap(school2, many)?.total).toBe(120));
  it("試行なしはnull", () => expect(L.latestGap({ id: "none", name: "n", subjects: [] }, many)).toBe(null));
});

describe("buildShareText", () => {
  it("正の乖離", () => expect(L.buildShareText(school4, at1, L.computeGap(school4, at1))).toBe("過去問 桜花中 2025年度: 350/500(合格最低点+30) #中学受験"));
  it("負の乖離", () => {
    const atNear: Attempt = { id: "n", schoolId: "sc1", year: 2025, round: "", scores: { 国語: 100, 算数: 100, 理科: 50, 社会: 50 }, minPass: 320, memo: "" };
    expect(L.buildShareText(school4, atNear, L.computeGap(school4, atNear))).toBe("過去問 桜花中 2025年度: 300/500(合格最低点-20) #中学受験");
  });
  it("最低点なしは乖離を出さない・回つき", () => {
    const a: Attempt = { id: "r", schoolId: "sc1", year: 2024, round: "①", scores: { 国語: 90, 算数: 110 }, minPass: null, memo: "" };
    expect(L.buildShareText(school4, a, L.computeGap(school4, a))).toBe("過去問 桜花中 2024年度①: 200/300 #中学受験");
  });
});

describe("validateAttempt", () => {
  it("正常はok", () => expect(L.validateAttempt(school4, at1).ok).toBe(true));
  it("年度範囲外NG", () => expect(L.validateAttempt(school4, { year: 1500, scores: { 国語: 100 } }).ok).toBe(false));
  it("満点超NG", () => expect(L.validateAttempt(school4, { year: 2025, scores: { 国語: 200 } }).ok).toBe(false));
  it("全科目未入力NG", () => expect(L.validateAttempt(school4, { year: 2025, scores: {} }).ok).toBe(false));
  it("最低点負NG", () => expect(L.validateAttempt(school4, { year: 2025, scores: { 国語: 100 }, minPass: -5 }).ok).toBe(false));
  it("0点のみでもok", () => expect(L.validateAttempt(school4, { year: 2025, scores: { 国語: 0 } }).ok).toBe(true));
});

describe("validateSchool", () => {
  it("正常", () => expect(L.validateSchool({ name: "桜花中", subjects: [{ name: "国語", max: 150 }] }).ok).toBe(true));
  it("名前空NG", () => expect(L.validateSchool({ name: "", subjects: [{ name: "国語", max: 100 }] }).ok).toBe(false));
  it("科目ゼロNG", () => expect(L.validateSchool({ name: "X", subjects: [] }).ok).toBe(false));
  it("満点0NG", () => expect(L.validateSchool({ name: "X", subjects: [{ name: "国語", max: 0 }] }).ok).toBe(false));
  it("満点500超NG", () => expect(L.validateSchool({ name: "X", subjects: [{ name: "国語", max: 999 }] }).ok).toBe(false));
});

describe("SUBJECT_PRESETS", () => {
  it("3種", () => expect(L.SUBJECT_PRESETS.length).toBe(3));
  it("4科", () => expect(L.SUBJECT_PRESETS[0].subjects.length).toBe(4));
  it("2科", () => expect(L.SUBJECT_PRESETS[2].subjects.length).toBe(2));
});

describe("migrateState", () => {
  const mig = L.migrateState({
    schools: [
      { id: "s1", name: "A中", subjects: [{ name: "国語", max: "150" }] },
      { id: "", name: "壊れ" },
      null,
    ],
    attempts: [
      { id: "a1", schoolId: "s1", year: "2025", scores: { 国語: 100 }, minPass: "300" },
      { id: "a2", schoolId: "ghost", year: 2025, scores: {} },
      null,
    ],
  });
  it("壊れた学校を除去", () => expect(mig.schools.length).toBe(1));
  it("maxを数値化", () => expect(mig.schools[0].subjects[0].max).toBe(150));
  it("親なし試行を除去", () => expect(mig.attempts.length).toBe(1));
  it("minPassを数値化", () => expect(mig.attempts[0].minPass).toBe(300));
  it("yearを数値化", () => expect(mig.attempts[0].year).toBe(2025));
  it("nullでも初期化", () => expect(L.migrateState(null).schools.length).toBe(0));
  it("文字列ゴミでも初期化", () => expect(L.migrateState("garbage").version).toBe(1));
});

describe("uuid", () => {
  it("重複しない", () => expect(L.uuid()).not.toBe(L.uuid()));
});

describe("findReference(同梱データの参考値)", () => {
  const school: L.School = {
    id: "s1",
    name: "A中",
    subjects: [{ name: "算数", max: 100 }],
    reference: [
      { year: 2025, round: "①", minPass: 320, avg: 305 },
      { year: 2025, round: "②", minPass: 330, avg: 310 },
      { year: 2024, round: "", minPass: 315, avg: 300 },
    ],
  };
  it("年度・回が一致する値を引く", () => expect(L.findReference(school, 2025, "②")?.minPass).toBe(330));
  it("回が空でも年度一致で代用", () => expect(L.findReference(school, 2025, "")?.year).toBe(2025));
  it("該当なしはnull", () => expect(L.findReference(school, 2099, "①")).toBeNull());
  it("referenceが無い学校はnull", () =>
    expect(L.findReference({ id: "x", name: "B", subjects: [] }, 2025, "")).toBeNull());
});

describe("migrateState で reference/source を保持", () => {
  const mig = L.migrateState({
    schools: [
      {
        id: "s1",
        name: "A中",
        subjects: [{ name: "算数", max: 100 }],
        reference: [
          { year: "2025", round: "①", minPass: "320", avg: "305" },
          { year: "bad" },
        ],
        source: { label: "公式", url: "https://example.jp", asof: "2026-06" },
      },
    ],
    attempts: [],
  });
  it("referenceの不正年度を除去", () => expect(mig.schools[0].reference?.length).toBe(1));
  it("reference数値を正規化", () => expect(mig.schools[0].reference?.[0].minPass).toBe(320));
  it("sourceを保持", () => expect(mig.schools[0].source?.url).toBe("https://example.jp"));
});

describe("buildGuidance(記録→指針)", () => {
  it("記録ゼロは『まず1年分』のinfo", () => {
    const g = L.buildGuidance(school4, []);
    expect(g.tone).toBe("info");
    expect(g.headline).toContain("まず1年分");
  });
  it("最低点未入力は『合格最低点を入れると』のinfo", () => {
    const noLine: Attempt = { id: "n1", schoolId: "sc1", year: 2025, round: "", scores: { 国語: 100, 算数: 120, 理科: 60, 社会: 70 }, minPass: null, memo: "" };
    const g = L.buildGuidance(school4, [noLine]);
    expect(g.tone).toBe("info");
    expect(g.headline).toContain("合格最低点");
  });
  it("合格圏はgoodで『この調子』", () => {
    // 合計350 / 最低点320 → +30 = PASS
    const a: Attempt = { id: "p1", schoolId: "sc1", year: 2025, round: "", scores: { 国語: 110, 算数: 120, 理科: 60, 社会: 60 }, minPass: 320, memo: "" };
    const g = L.buildGuidance(school4, [a]);
    expect(g.tone).toBe("good");
    expect(g.detail).toContain("+30");
  });
  it("BELOWは弱点科目で『あと何点』のleverを返す", () => {
    // 合計260 / 最低点320 → -60。理科が弱点。
    const a: Attempt = { id: "b1", schoolId: "sc1", year: 2025, round: "", scores: { 国語: 90, 算数: 90, 理科: 30, 社会: 50 }, minPass: 320, memo: "" };
    const g = L.buildGuidance(school4, [a]);
    expect(g.detail).toContain("あと60点");
    expect(g.lever).toContain("理科");
  });
  it("伸びていれば励ましを返す", () => {
    const old: Attempt = { id: "o1", schoolId: "sc1", year: 2024, round: "", scores: { 国語: 60, 算数: 60, 理科: 40, 社会: 40 }, minPass: 320, memo: "" };
    const recent: Attempt = { id: "r1", schoolId: "sc1", year: 2025, round: "", scores: { 国語: 110, 算数: 120, 理科: 60, 社会: 60 }, minPass: 320, memo: "" };
    const g = L.buildGuidance(school4, [old, recent]);
    expect(g.encouragement).toContain("伸び");
  });
});

describe("過去問プラン(buildPlanRows / planProgress / suggestPlan)", () => {
  const planned: School = { ...school4, plan: [{ year: 2025, round: "①" }, { year: 2024, round: "①" }, { year: 2023, round: "①" }] };
  const doneOne: Attempt = { id: "p1", schoolId: "sc1", year: 2025, round: "①", scores: { 国語: 100, 算数: 120, 理科: 60, 社会: 70 }, minPass: 320, memo: "" };

  it("予定コマと記録を年度降順で統合", () => {
    const rows = L.buildPlanRows(planned, [doneOne]);
    expect(rows.map((r) => r.year)).toEqual([2025, 2024, 2023]);
  });
  it("記録のあるコマは done=true", () => {
    const rows = L.buildPlanRows(planned, [doneOne]);
    expect(rows.find((r) => r.year === 2025)?.done).toBe(true);
    expect(rows.find((r) => r.year === 2024)?.done).toBe(false);
  });
  it("予定外の年度を記録しても統合される(コマが増える)", () => {
    const extra: Attempt = { ...doneOne, id: "p2", year: 2022, round: "①" };
    const rows = L.buildPlanRows(planned, [doneOne, extra]);
    expect(rows.map((r) => r.year)).toEqual([2025, 2024, 2023, 2022]);
  });
  it("消化率=済/全コマ", () => {
    expect(L.planProgress(planned, [doneOne])).toEqual({ done: 1, total: 3, rate: 33 });
  });
  it("空入力(0科目)のコマは done=false", () => {
    const empty: Attempt = { id: "e1", schoolId: "sc1", year: 2024, round: "①", scores: {}, minPass: null, memo: "" };
    expect(L.buildPlanRows(planned, [empty]).find((r) => r.year === 2024)?.done).toBe(false);
  });
  it("suggestPlan は直近N年×回なしを返す", () => {
    expect(L.suggestPlan(2025, 3)).toEqual([{ year: 2025, round: "" }, { year: 2024, round: "" }, { year: 2023, round: "" }]);
  });
  it("migrateState が plan を保持", () => {
    const m = L.migrateState({ schools: [{ id: "x", name: "A", subjects: [{ name: "国", max: 100 }], plan: [{ year: 2025, round: "①" }, { year: "bad" }] }], attempts: [] });
    expect(m.schools[0].plan).toEqual([{ year: 2025, round: "①" }]);
  });
});

describe("入試日ペース・解き直し・効いているか", () => {
  const planned: School = { ...school4, plan: [{ year: 2025, round: "①" }, { year: 2024, round: "①" }, { year: 2023, round: "①" }], examDate: "2026-02-01" };
  const a25: Attempt = { id: "p1", schoolId: "sc1", year: 2025, round: "①", scores: { 国語: 110, 算数: 120, 理科: 60, 社会: 60 }, minPass: 320, memo: "", reviewed: true };
  const a24: Attempt = { id: "p0", schoolId: "sc1", year: 2024, round: "①", scores: { 国語: 80, 算数: 80, 理科: 40, 社会: 40 }, minPass: 320, memo: "" };

  it("daysUntil:残り日数", () => {
    expect(L.daysUntil("2026-02-01", "2026-01-01")).toBe(31);
    expect(L.daysUntil(undefined, "2026-01-01")).toBe(null);
  });
  it("buildPace:未消化と日数からペース", () => {
    const p = L.buildPace(planned, [a25], "2026-01-01"); // 残2コマ・31日
    expect(p.remain).toBe(2);
    expect(p.daysLeft).toBe(31);
    expect(p.daysPerSlot).toBe(15);
  });
  it("reviewProgress:済のうち直し済み数", () => {
    expect(L.reviewProgress(planned, [a25, a24])).toEqual({ reviewed: 1, done: 2 });
  });
  it("buildEffect:伸びと直し(因果でなく事実)", () => {
    // 2024は得点率48%相当→2025は高い。最新が上=up
    const e = L.buildEffect(planned, [a25, a24]);
    expect(e.trend).toBe("up");
    expect(e.rise).not.toBeNull();
    expect(e.reviewed).toBe(1);
  });
  it("buildEffect:記録1件は trend=none", () => {
    expect(L.buildEffect(planned, [a25]).trend).toBe("none");
  });
  it("migrateState が examDate / reviewed を保持", () => {
    const m = L.migrateState({ schools: [{ id: "x", name: "A", subjects: [{ name: "国", max: 100 }], examDate: "2026-02-01" }], attempts: [{ id: "a", schoolId: "x", year: 2025, round: "", scores: { 国: 60 }, minPass: null, memo: "", reviewed: true }] });
    expect(m.schools[0].examDate).toBe("2026-02-01");
    expect(m.attempts[0].reviewed).toBe(true);
  });
});

describe("週の学習時間割(suggestTimetable)", () => {
  const planned: School = { ...school4, plan: [{ year: 2025, round: "①" }, { year: 2024, round: "①" }] };
  // 理科だけ著しく低い→弱点。配分が最も多くなるはず。
  const a: Attempt = { id: "t1", schoolId: "sc1", year: 2025, round: "①", scores: { 国語: 135, 算数: 135, 理科: 30, 社会: 90 }, minPass: 320, memo: "" };

  it("7日×15枠(7:00〜21:00)を返す", () => {
    const g = L.suggestTimetable(planned, [a]);
    expect(g.length).toBe(7);
    g.forEach((row) => expect(row.length).toBe(L.TT_HOURS.length));
  });
  it("弱点(理科)が最も多く配分される", () => {
    const g = L.suggestTimetable(planned, [a]);
    const flat = g.flat();
    const count = (s: string) => flat.filter((x) => x === s).length;
    expect(count("理科")).toBeGreaterThanOrEqual(count("国語"));
    expect(count("理科")).toBeGreaterThanOrEqual(count("社会"));
  });
  it("過去問は週末(土日)の午前に入り、平日には入らない", () => {
    const g = L.suggestTimetable(planned, []); // 2コマ未消化
    const weekend = [...g[5], ...g[6]];
    expect(weekend.filter((x) => x === "過去問").length).toBeGreaterThan(0);
    const weekday = [...g[0], ...g[1], ...g[2], ...g[3], ...g[4]];
    expect(weekday.filter((x) => x === "過去問").length).toBe(0);
  });
  it("学校・塾の枠は提案で保持される(空き時刻だけ埋める)", () => {
    const base = L.defaultTimetable(); // 平日8-15が学校
    base[1][L.TT_HOURS.indexOf(17)] = "塾"; // 火17:00を塾に
    const g = L.suggestTimetable(planned, [a], base);
    expect(g[1][L.TT_HOURS.indexOf(17)]).toBe("塾");
    expect(g[0][L.TT_HOURS.indexOf(9)]).toBe("学校"); // 月9:00は学校のまま
  });
  it("defaultTimetable は平日8-15を学校で初期化", () => {
    const g = L.defaultTimetable();
    expect(g[0][L.TT_HOURS.indexOf(9)]).toBe("学校"); // 月9:00
    expect(g[5][L.TT_HOURS.indexOf(9)]).toBe(""); // 土9:00は空き
  });
  it("migrateState が timetable を15枠に正規化", () => {
    const tt = Array.from({ length: 7 }, () => ["学校", "", "過去問"]);
    const m = L.migrateState({ schools: [{ id: "x", name: "A", subjects: [{ name: "国語", max: 100 }], timetable: tt }], attempts: [] });
    expect(m.schools[0].timetable?.length).toBe(7);
    expect(m.schools[0].timetable?.[0].length).toBe(L.TT_HOURS.length);
  });
});

describe("SCHOOL_CATALOG(同梱データ方針)", () => {
  it("全エントリに出典がある", async () => {
    const { SCHOOL_CATALOG } = await import("./schoolCatalog");
    for (const c of SCHOOL_CATALOG) expect(c.source && typeof c.source.label === "string" && c.source.label.length).toBeTruthy();
  });
  it("参考値はminPass/avgが数値かnull(捏造防止の型保証)", async () => {
    const { SCHOOL_CATALOG } = await import("./schoolCatalog");
    for (const c of SCHOOL_CATALOG)
      for (const r of c.reference) {
        if (r.minPass != null) expect(typeof r.minPass).toBe("number");
        if (r.avg != null) expect(typeof r.avg).toBe("number");
      }
  });
});
