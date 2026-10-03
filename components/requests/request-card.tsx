"use client";

import { MapPin, Users } from "lucide-react";
import Link from "next/link";

import { Badge, ColorBadge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import type { BoardRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

import { TimerChip } from "./timer-chip";

export function RequestTags({ r }: { r: Pick<BoardRequest, "isDrill" | "isBackEntry" | "selfRaised"> }) {
  const { t } = useI18n();
  return (
    <>
      {r.isDrill && <Badge variant="warning">{t("common.drill")}</Badge>}
      {r.isBackEntry && <Badge variant="secondary">{t("common.backEntry")}</Badge>}
      {r.selfRaised && <Badge variant="outline">{t("common.selfRaised")}</Badge>}
    </>
  );
}

export function RequestTimers({ r, now, amberPct, size = "sm" }: { r: BoardRequest; now: number; amberPct: number; size?: "sm" | "lg" }) {
  const { t } = useI18n();
  const ended = r.status.behaviour === "TERMINAL" && r.status.meaning !== "CLOSED";
  return (
    <div className="flex flex-wrap gap-1.5">
      <TimerChip label={t("board.dispatch")} startedAt={r.requestedAt} doneAt={r.dispatchedAt} targetMin={r.priority.dispatchTargetMin} now={now} amberPct={amberPct} stopped={ended} size={size} />
      <TimerChip label={t("board.arrive")} startedAt={r.requestedAt} doneAt={r.arrivedAt} targetMin={r.priority.arriveTargetMin} now={now} amberPct={amberPct} stopped={ended} size={size} />
      <TimerChip label={t("board.resolve")} startedAt={r.requestedAt} doneAt={r.resolvedAt} targetMin={r.priority.resolveTargetMin} now={now} amberPct={amberPct} stopped={ended} size={size} />
    </div>
  );
}

export function RequestCard({ r, now, amberPct, large }: { r: BoardRequest; now: number; amberPct: number; large?: boolean }) {
  const { t, label } = useI18n();
  const active = r.assignments.filter((a) => !a.releasedAt);
  const terminal = r.status.behaviour === "TERMINAL";
  return (
    <Link
      href={`/requests/${r.id}`}
      data-testid={`request-card-${r.code}`}
      className={cn(
        "bg-card hover:bg-accent/40 group relative flex flex-col gap-2 overflow-hidden rounded-lg border p-3 pl-4 transition-colors",
        terminal && "opacity-60",
        large && "gap-3 p-4 pl-5",
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: r.priority.color }} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("font-mono text-sm font-bold", large && "text-xl")}>{r.code}</span>
        <ColorBadge color={r.priority.color}>{label(r.priority)}</ColorBadge>
        <ColorBadge color={r.status.color}>{label(r.status)}</ColorBadge>
        <RequestTags r={r} />
        {r.manpower.length > 0 && <Badge variant="destructive">{t("board.manpowerAsk", { n: r.manpower.reduce((s, m) => s + m.membersAsked, 0) })}</Badge>}
        {r.reserveReleases.length > 0 && <Badge variant="warning">{t("board.reservePending")}</Badge>}
      </div>
      <div className={cn("font-semibold", large && "text-xl")}>
        {label(r.issueType)}
        {r.description && <span className="text-muted-foreground font-normal"> · {r.description}</span>}
      </div>
      <div className={cn("text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm", large && "text-base")}>
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {r.location ? label(r.location) : label(r.zone)}
          {r.landmark && ` · ${r.landmark}`}
        </span>
        <span className="rounded px-1.5 text-xs font-semibold text-white" style={{ backgroundColor: r.zone.color }}>
          {r.zone.code}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" />
          {r.membersNeeded}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {active.length === 0 && !terminal && <span className="text-sm font-medium text-red-700 dark:text-red-400">{t("board.waiting")}</span>}
        {active.map((a) => (
          <ColorBadge key={a.id} color={a.status.color}>
            {a.team.code} · {label(a.status)}
          </ColorBadge>
        ))}
      </div>
      <RequestTimers r={r} now={now} amberPct={amberPct} size={large ? "lg" : "sm"} />
    </Link>
  );
}
