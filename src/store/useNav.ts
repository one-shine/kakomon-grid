import { create } from "zustand";

export type View = "home" | "detail" | "schoolForm" | "attemptForm";

interface NavState {
  view: View;
  schoolId: string | null;
  attemptId: string | null; // null = 新規
  goHome: () => void;
  goDetail: (schoolId: string) => void;
  goSchoolForm: (schoolId: string | null) => void;
  goAttemptForm: (schoolId: string, attemptId: string | null) => void;
}

export const useNav = create<NavState>((set) => ({
  view: "home",
  schoolId: null,
  attemptId: null,
  goHome: () => set({ view: "home", attemptId: null }),
  goDetail: (schoolId) => set({ view: "detail", schoolId, attemptId: null }),
  goSchoolForm: (schoolId) => set({ view: "schoolForm", schoolId }),
  goAttemptForm: (schoolId, attemptId) => set({ view: "attemptForm", schoolId, attemptId }),
}));
