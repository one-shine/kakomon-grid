import { Minus, Plus } from "lucide-react";

// 数値ステッパー。年度など「現在値の近く」を素早く選ぶ用(手打ちを減らす)。
export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const clamp = (v: number) => (min != null && v < min ? min : max != null && v > max ? max : v);
  const btn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line " +
    "text-neutral-900 transition-colors active:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none";
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="減らす" className={btn} disabled={min != null && value <= min}
        onClick={() => onChange(clamp(value - step))}>
        <Minus size={18} />
      </button>
      <div className="nums min-w-12 text-center text-lg font-semibold text-neutral-900">
        {value}
        {suffix && <span className="ml-0.5 text-sm font-normal text-neutral-500">{suffix}</span>}
      </div>
      <button type="button" aria-label="増やす" className={btn} disabled={max != null && value >= max}
        onClick={() => onChange(clamp(value + step))}>
        <Plus size={18} />
      </button>
    </div>
  );
}
