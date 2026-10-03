"use client";

import * as React from "react";

// Server clock offset so timers match the server even if a phone's clock is wrong.
let offsetMs = 0;

export function syncServerTime(serverNow: string | undefined) {
  if (!serverNow) return;
  const t = Date.parse(serverNow);
  if (Number.isFinite(t)) offsetMs = t - Date.now();
}

export const serverNow = () => Date.now() + offsetMs;

/** Re-renders every `ms` milliseconds and returns the server-adjusted time. */
export function useNow(ms = 1000) {
  const [now, setNow] = React.useState(serverNow);
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(serverNow()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

export function minutesBetween(from: string | number | Date, to: string | number | Date) {
  return (+new Date(to) - +new Date(from)) / 60_000;
}

/** "4:05" style elapsed time. */
export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

const TZ = "Asia/Kolkata";

export function formatTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
}

export function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
}

export type TimerState = "pending" | "ok" | "amber" | "red" | "met" | "missed";

/**
 * A response target measured from the call (spec 5.2).
 * Running: ok → amber at amberPct% → red after the target. Finished: met or missed.
 */
export function timerState(startedAt: string, doneAt: string | null, targetMin: number, now: number, amberPct: number): { state: TimerState; elapsedMs: number } {
  const start = Date.parse(startedAt);
  const end = doneAt ? Date.parse(doneAt) : now;
  const elapsedMs = end - start;
  const pct = (elapsedMs / (targetMin * 60_000)) * 100;
  if (doneAt) return { state: pct <= 100 ? "met" : "missed", elapsedMs };
  return { state: pct > 100 ? "red" : pct >= amberPct ? "amber" : "ok", elapsedMs };
}

/** Today's date (YYYY-MM-DD) in the event timezone. */
export function todayInTz() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Value for <input type="datetime-local"> in the event timezone. */
export function toLocalInput(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${v("year")}-${v("month")}-${v("day")}T${v("hour") === "24" ? "00" : v("hour")}:${v("minute")}`;
}

/** Converts a datetime-local value entered in IST to an ISO string. */
export function fromLocalInput(v: string) {
  return v ? new Date(`${v}:00+05:30`).toISOString() : null;
}
