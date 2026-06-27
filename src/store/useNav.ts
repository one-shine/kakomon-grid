import { create } from "zustand";

export type View = "home" | "detail" | "schoolForm" | "attemptForm";

export interface AttemptPrefill {
  year: number;
  round: string;
}

interface NavState {
  view: View;
  schoolId: string | null;
  attemptId: string | null; // null = 新規
  prefill: AttemptPrefill | null; // 新規記録の年度・回の初期値(プランのコマから記録するとき)
  goHome: () => void;
  goDetail: (schoolId: string) => void;
  goSchoolForm: (schoolId: string | null) => void;
  goAttemptForm: (schoolId: string, attemptId: string | null, prefill?: AttemptPrefill | null) => void;
}

export const useNav = create<NavState>((set) => ({
  view: "home",
  schoolId: null,
  attemptId: null,
  prefill: null,
  goHome: () => set({ view: "home", attemptId: null, prefill: null }),
  goDetail: (schoolId) => set({ view: "detail", schoolId, attemptId: null, prefill: null }),
  goSchoolForm: (schoolId) => set({ view: "schoolForm", schoolId }),
  goAttemptForm: (schoolId, attemptId, prefill = null) => set({ view: "attemptForm", schoolId, attemptId, prefill }),
}));
