"use client";

import { Shield, Users } from "lucide-react";
import Link from "next/link";

import { useI18n } from "@/lib/i18n";
import { formatElapsed } from "@/lib/time";
import type { BoardTeam, ReserveIndicator as Reserve } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TeamTile({ team, now, large, onClick }: { team: BoardTeam; now: number; large?: boolean; onClick?: () => void }) {
  const { t, label } = useI18n();
  const color = team.status?.color ?? "#64748b";
  const job = team.assignments[0];
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && (e.key === "Enter" || e.key === " ") && onClick()}
      data-testid={`team-tile-${team.code}`}
      className={cn("bg-card flex flex-col gap-1.5 rounded-lg border-2 p-3", onClick && "hover:bg-accent/40 cursor-pointer", large && "gap-2 p-4")}
      style={{ borderColor: color }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("font-mono font-bold", large ? "text-2xl" : "text-base")}>{team.code}</span>
        <span className="rounded px-1.5 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: color }}>
          {team.status ? label(team.status) : "—"}
        </span>
      </div>
      <div className={cn("text-muted-foreground flex items-center gap-2 text-xs", large && "text-sm")}>
        {team.isReserve ? (
          <span className="inline-flex items-center gap-1 font-semibold">
            <Shield className="size-3" /> {t("common.reserve")}
          </span>
        ) : (
          <span className="rounded px-1 font-semibold text-white" style={{ backgroundColor: team.homeZone.color }}>
            {team.homeZone.code}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users className="size-3" /> {team.membersOnDuty}
        </span>
        <span className="ml-auto font-mono tabular-nums">{formatElapsed(now - Date.parse(team.statusChangedAt))}</span>
      </div>
      {job ? (
        <Link href={`/requests/${job.request.id}`} onClick={(e) => e.stopPropagation()} className={cn("truncate text-xs font-medium underline-offset-2 hover:underline", large && "text-sm")}>
          {job.request.code} · {label(job.request.issueType)}
          {job.request.location ? ` · ${label(job.request.location)}` : ""}
        </Link>
      ) : (
        <span className={cn("text-muted-foreground truncate text-xs", large && "text-sm")}>{team.standbyPoint ? label(team.standbyPoint) : label(team)}</span>
      )}
    </div>
  );
}

export function ReserveIndicator({ reserve, compact }: { reserve: Reserve; compact?: boolean }) {
  const { t } = useI18n();
  const map = {
    LOW: { cls: "bg-red-600 text-white", text: t("reserve.low") },
    OK: { cls: "bg-emerald-600 text-white", text: t("reserve.ok") },
    HIGH: { cls: "bg-amber-400 text-amber-950", text: t("reserve.high") },
    UNKNOWN: { cls: "bg-muted text-muted-foreground", text: t("reserve.unknown") },
  }[reserve.state];
  return (
    <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2", map.cls)} data-testid="reserve-indicator">
      <Shield className="size-5" />
      <div className="leading-tight">
        <div className="text-xs font-medium uppercase opacity-90">{t("reserve.title")}</div>
        <div className={cn("font-bold tabular-nums", compact ? "text-lg" : "text-2xl")}>{reserve.pct === null ? "—" : `${reserve.pct}%`}</div>
      </div>
      <div className="ml-auto text-right text-xs leading-tight">
        <div className="font-semibold">{map.text}</div>
        <div className="opacity-90">{t("reserve.band", { min: reserve.minPct, max: reserve.maxPct })}</div>
        <div className="opacity-90">
          {reserve.reserveOnDuty}/{reserve.totalOnDuty}
        </div>
      </div>
    </div>
  );
}
