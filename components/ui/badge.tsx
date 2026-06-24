import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Badge — pill-shaped tag for status, category, count.
 *
 * Uses inline style for borderRadius so variant A's --radius-full: 0 cascades
 * correctly. Tailwind's `rounded-full` class compiles to a fixed 9999px value
 * that ignores CSS variables — and that breaks the truly-squared variant A.
 */

const badgeVariants = cva(
  "inline-flex items-center gap-1 px-2 text-[length:var(--text-xs)] font-medium leading-tight h-[22px]",
  {
    variants: {
      intent: {
        neutral: "bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
        primary: "bg-[var(--color-primary-100)] text-[var(--color-primary-700)]",
        success: "bg-[var(--color-success-50)] text-[var(--color-success-900)]",
        warning: "bg-[var(--color-warning-50)] text-[var(--color-warning-900)]",
        danger: "bg-[var(--color-danger-50)] text-[var(--color-danger-900)]",
        info: "bg-[var(--color-info-50)] text-[var(--color-info-900)]",
      },
    },
    defaultVariants: { intent: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, intent, style, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ intent }), className)}
      style={{ borderRadius: "var(--radius-full)", ...style }}
      {...props}
    />
  )
);
Badge.displayName = "Badge";
