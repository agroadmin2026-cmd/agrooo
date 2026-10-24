import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end sm:justify-between mb-5 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground break-words">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-card shadow-card", className)}>{children}</div>;
}

const tones = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/25 text-accent-foreground",
  danger: "bg-destructive/10 text-destructive",
  success: "bg-success/15 text-success",
  warning: "bg-warning/25 text-warning-foreground",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof tones;
}) {
  return (
    <Panel className="p-3.5 sm:p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs sm:text-sm text-muted-foreground font-semibold leading-tight line-clamp-2">
          {label}
        </p>
        <div className={cn("grid place-items-center size-8 sm:size-9 rounded-lg shrink-0", tones[tone])}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-2 sm:mt-3">
        <p className="text-lg sm:text-2xl md:text-3xl font-bold num tracking-tight text-foreground truncate">
          {value}
        </p>
        {hint && (
          <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground truncate">{hint}</div>
        )}
      </div>
    </Panel>
  );
}

const pillTones = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/25 text-warning-foreground",
  danger: "bg-destructive/12 text-destructive",
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
} as const;

export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof pillTones;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        pillTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
