"use client";

import { formatElapsed, timerState, type TimerState } from "@/lib/time";
import { cn } from "@/lib/utils";

const STYLE: Record<TimerState, string> = {
  pending: "bg-muted text-muted-foreground",
  ok: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  amber: "bg-amber-200 text-amber-950 dark:bg-amber-800/60 dark:text-amber-50",
  red: "bg-red-600 text-white animate-pulse",
  met: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  missed: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

/** One response target (dispatch / arrive / resolve), measured from the call. */
export function TimerChip({
  label,
  startedAt,
  doneAt,
  targetMin,
  now,
  amberPct,
  stopped,
  size = "sm",
}: {
  label: string;
  startedAt: string;
  doneAt: string | null;
  targetMin: number;
  now: number;
  amberPct: number;
  /** The request ended without reaching this step (e.g. cancelled). */
  stopped?: boolean;
  size?: "sm" | "lg";
}) {
  if (stopped && !doneAt) {
    return (
      <span className={cn("inline-flex flex-col rounded-md px-2 py-1 leading-tight", STYLE.pending, size === "lg" && "px-3 py-2")}>
        <span className="text-[10px] font-medium uppercase">{label}</span>
        <span className="font-mono text-sm">—</span>
      </span>
    );
  }
  const { state, elapsedMs } = timerState(startedAt, doneAt, targetMin, now, amberPct);
  return (
    <span
      className={cn("inline-flex flex-col rounded-md px-2 py-1 leading-tight", STYLE[state], size === "lg" && "px-3 py-2")}
      title={`Target ${targetMin} min`}
    >
      <span className={cn("text-[10px] font-medium uppercase opacity-90", size === "lg" && "text-xs")}>
        {label} · {targetMin}′
      </span>
      <span className={cn("font-mono text-sm font-semibold tabular-nums", size === "lg" && "text-2xl")}>
        {state === "met" ? "✓ " : state === "missed" ? "✗ " : ""}
        {formatElapsed(elapsedMs)}
      </span>
    </span>
  );
}
