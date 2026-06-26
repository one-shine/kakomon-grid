import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// shadcn/ui 流の Button(cva でバリアント管理)
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-400",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-ink active:opacity-90 shadow-sm",
        ghost: "border border-line bg-transparent text-neutral-900 hover:bg-neutral-50",
        danger: "bg-red-600 text-white hover:bg-red-700",
        dangerGhost: "border border-line bg-transparent text-red-600 hover:bg-red-50",
      },
      size: {
        block: "w-full px-4 py-3.5 text-base",
        md: "px-4 py-2.5 text-sm",
        sm: "px-3 py-2 text-xs rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
