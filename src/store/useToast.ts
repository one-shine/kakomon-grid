import { create } from "zustand";

interface ToastState {
  message: string | null;
  actionLabel?: string;
  action?: () => void;
  show: (message: string, actionLabel?: string, action?: () => void) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  message: null,
  show(message, actionLabel, action) {
    if (timer) clearTimeout(timer);
    set({ message, actionLabel, action });
    timer = setTimeout(() => set({ message: null, actionLabel: undefined, action: undefined }), action ? 6000 : 2600);
  },
  hide() {
    if (timer) clearTimeout(timer);
    set({ message: null, actionLabel: undefined, action: undefined });
  },
}));
