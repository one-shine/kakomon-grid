import { useToast } from "@/store/useToast";

export function Toast() {
  const { message, actionLabel, action, hide } = useToast();
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 bottom-[max(24px,env(safe-area-inset-bottom))] z-50 -translate-x-1/2 flex items-center gap-3 rounded-full bg-neutral-900 px-4 py-3 text-sm font-semibold text-white shadow-xl max-w-[calc(100%-32px)]"
    >
      <span>{message}</span>
      {actionLabel && action && (
        <button
          type="button"
          className="rounded-full border border-white/50 px-2.5 py-1 text-sm font-bold"
          onClick={() => {
            hide();
            action();
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
