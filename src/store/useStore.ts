import { create } from "zustand";
import { persist } from "zustand/middleware";
import { migrateState, suggestPlan, uuid } from "@/lib/logic";
import type { AppState, School, Attempt, Subject, PlanSlot } from "@/lib/logic";

// 学校追加時に「直近3年」をやる過去問の初期プランとして入れる(=開いた瞬間にやる事がある)。
function defaultPlan(): PlanSlot[] {
  return suggestPlan(new Date().getFullYear() - 1, 3);
}

interface Store {
  schools: School[];
  attempts: Attempt[];
  // schools
  addSchool: (name: string, subjects: Subject[]) => string;
  addSchoolFull: (school: Omit<School, "id" | "sample">) => string;
  updateSchool: (id: string, name: string, subjects: Subject[]) => void;
  removeSchool: (id: string) => void;
  // plan(やる過去問の計画)
  addPlanSlot: (schoolId: string, slot: PlanSlot) => void;
  removePlanSlot: (schoolId: string, year: number, round: string) => void;
  setExamDate: (schoolId: string, date: string) => void;
  // attempts
  addAttempt: (a: Omit<Attempt, "id" | "sample">) => string;
  updateAttempt: (id: string, patch: Partial<Attempt>) => void;
  removeAttempt: (id: string) => Attempt | null;
  restoreAttempt: (a: Attempt) => void;
  // sample
  seedSample: () => string;
  clearSample: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      schools: [],
      attempts: [],

      addSchool(name, subjects) {
        const id = uuid();
        set((s) => ({ schools: [...s.schools, { id, name, subjects, plan: defaultPlan(), sample: false }] }));
        return id;
      },
      addSchoolFull(school) {
        const id = uuid();
        set((s) => ({ schools: [...s.schools, { plan: defaultPlan(), ...school, id, sample: false }] }));
        return id;
      },

      addPlanSlot(schoolId, slot) {
        set((s) => ({
          schools: s.schools.map((sc) => {
            if (sc.id !== schoolId) return sc;
            const plan = sc.plan ?? [];
            if (plan.some((p) => p.year === slot.year && (p.round || "") === (slot.round || ""))) return sc;
            return { ...sc, plan: [...plan, { year: slot.year, round: slot.round || "" }] };
          }),
        }));
      },
      removePlanSlot(schoolId, year, round) {
        set((s) => ({
          schools: s.schools.map((sc) =>
            sc.id === schoolId
              ? { ...sc, plan: (sc.plan ?? []).filter((p) => !(p.year === year && (p.round || "") === (round || ""))) }
              : sc,
          ),
        }));
      },
      setExamDate(schoolId, date) {
        set((s) => ({ schools: s.schools.map((sc) => (sc.id === schoolId ? { ...sc, examDate: date || undefined } : sc)) }));
      },
      updateSchool(id, name, subjects) {
        // 名前・科目だけ更新。reference/source(同梱データ由来)は保持。
        set((s) => ({
          schools: s.schools.map((sc) => (sc.id === id ? { ...sc, name, subjects } : sc)),
        }));
      },
      removeSchool(id) {
        set((s) => ({
          schools: s.schools.filter((sc) => sc.id !== id),
          attempts: s.attempts.filter((a) => a.schoolId !== id),
        }));
      },

      addAttempt(a) {
        const id = uuid();
        set((s) => ({ attempts: [...s.attempts, { ...a, id, sample: false }] }));
        return id;
      },
      updateAttempt(id, patch) {
        set((s) => ({ attempts: s.attempts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      },
      removeAttempt(id) {
        const found = get().attempts.find((a) => a.id === id) ?? null;
        set((s) => ({ attempts: s.attempts.filter((a) => a.id !== id) }));
        return found;
      },
      restoreAttempt(a) {
        set((s) => ({ attempts: [...s.attempts, a] }));
      },

      seedSample() {
        const sc: School = {
          id: uuid(),
          name: "見本中学校",
          sample: true,
          subjects: [
            { name: "国語", max: 150 },
            { name: "算数", max: 150 },
            { name: "理科", max: 100 },
            { name: "社会", max: 100 },
          ],
          // 計画→消化を見せるため、済2コマ＋未1コマ(2023①)の3コマ計画。
          plan: [
            { year: 2025, round: "①" },
            { year: 2024, round: "①" },
            { year: 2023, round: "①" },
          ],
          examDate: "2027-02-01", // 入試日の見本(残り日数・ペースの逆算を見せる)
        };
        const a1: Attempt = { id: uuid(), schoolId: sc.id, year: 2025, round: "①", scores: { 国語: 98, 算数: 105, 理科: 62, 社会: 71 }, minPass: 322, memo: "", reviewed: true, sample: true };
        const a2: Attempt = { id: uuid(), schoolId: sc.id, year: 2024, round: "①", scores: { 国語: 92, 算数: 88, 理科: 55, 社会: 64 }, minPass: 315, memo: "算数で時間切れ", sample: true };
        set((s) => ({ schools: [...s.schools, sc], attempts: [...s.attempts, a1, a2] }));
        return sc.id;
      },
      clearSample() {
        set((s) => {
          const schools = s.schools.filter((sc) => !sc.sample);
          const ids = new Set(schools.map((sc) => sc.id));
          return { schools, attempts: s.attempts.filter((a) => ids.has(a.schoolId)) };
        });
      },
    }),
    {
      name: "kg_state_v1",
      // 壊れた永続データを logic.migrateState で正規化(no-codeの保険)
      merge: (persisted, current) => {
        const m: AppState = migrateState(persisted);
        return { ...current, schools: m.schools, attempts: m.attempts };
      },
    },
  ),
);
