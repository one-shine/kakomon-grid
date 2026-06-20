import type { GapStatus } from "@/lib/logic";
import { cn } from "@/lib/cn";

const LABEL: Record<GapStatus, string> = {
  PASS: "合格圏",
  NEAR: "あと少し",
  BELOW: "要強化",
  NO_LINE: "最低点未入力",
};

// 色は機能(信号)にのみ使う(P4)
const CLASS: Record<GapStatus, string> = {
  PASS: "bg-emerald-50 text-emerald-700",
  NEAR: "bg-amber-50 text-amber-700",
  BELOW: "bg-red-50 text-red-700",
  NO_LINE: "bg-neutral-100 text-neutral-500",
};

export function StatusChip({ status, className }: { status: GapStatus; className?: string }) {
  return (
    <span className={cn("flex-none rounded-full px-2.5 py-1 text-xs font-bold", CLASS[status], className)}>
      {LABEL[status]}
    </span>
  );
}
