"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, ClipboardList, Eye, Settings2, Users } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ErrorState, Loading, PageHeader } from "@/components/common/states";
import { ReserveIndicator } from "@/components/teams/team-tile";
import { ColorBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { get } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useBoard, useLookups, useTeamBoard } from "@/lib/queries";
import { num, pct, type Report } from "@/lib/reports";
import { formatElapsed, useNow } from "@/lib/time";
import type { BoardRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

const todayIn = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

type Stage = "dispatch" | "arrive" | "resolve";

/** 7 min · 2 h 15 min · 3 d 4 h */
function span(min: number) {
  const m = Math.ceil(min);
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)} h ${m % 60} min`;
  return `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} h`;
}

/** Which step an open request is waiting for, and how far past that step's target it is (minutes, < 0 = on time). */
function lateness(r: BoardRequest, now: number): { stage: Stage; overMin: number } | null {
  if (r.status.behaviour === "TERMINAL" || r.resolvedAt) return null;
  const elapsed = (now - Date.parse(r.requestedAt)) / 60_000;
  const stage: Stage = !r.dispatchedAt ? "dispatch" : !r.arrivedAt ? "arrive" : "resolve";
  const target = stage === "dispatch" ? r.priority.dispatchTargetMin : stage === "arrive" ? r.priority.arriveTargetMin : r.priority.resolveTargetMin;
  return { stage, overMin: elapsed - target };
}

function Tile({ label, value, sub, tone, testId }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "bad" | "good"; testId?: string }) {
  return (
    <div className={cn("bg-card flex flex-col gap-1 rounded-xl border p-3", tone === "bad" && "border-red-300 dark:border-red-900")} data-testid={testId}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn("text-2xl font-bold tabular-nums", tone === "bad" && "text-red-700 dark:text-red-400")}>{value}</span>
      {sub && <span className={cn("text-xs", tone === "good" ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>{sub}</span>}
    </div>
  );
}

/** The Admin's home: the live picture of the event, view only. The Control Room runs operations. */
export default function OverviewPage() {
  const { t, label } = useI18n();
  const lookups = useLookups();
  const tz = lookups.data?.event?.timezone ?? "Asia/Kolkata";
  const today = todayIn(tz);
  const report = useQuery({ queryKey: ["report", "today", today], queryFn: () => get<Report>("/reports", { from: today, to: today }), refetchInterval: 30_000 });
  const board = useBoard(false);
  const teams = useTeamBoard();
  const now = useNow(5000);

  if (board.isLoading || teams.isLoading || report.isLoading) return <Loading />;
  if (board.error || teams.error || report.error) return <ErrorState error={board.error ?? teams.error ?? report.error} onRetry={() => [board, teams, report].forEach((q) => q.refetch())} />;

  const s = report.data!.summary;
  const open = (board.data?.requests ?? []).filter((r) => !r.isDrill && r.status.behaviour !== "TERMINAL");
  const late = open
    .map((r) => ({ r, l: lateness(r, now) }))
    .filter((x): x is { r: BoardRequest; l: { stage: Stage; overMin: number } } => !!x.l && x.l.overMin > 0)
    .sort((a, b) => a.r.priority.rank - b.r.priority.rank || b.l.overMin - a.l.overMin);
  const urgentOnTime = open.filter((r) => r.priority.rank === Math.min(...open.map((x) => x.priority.rank)) && !late.some((x) => x.r.id === r.id) && !r.resolvedAt);
  const attention = [...late.map((x) => ({ r: x.r, l: x.l as { stage: Stage; overMin: number } | null })), ...urgentOnTime.map((r) => ({ r, l: null }))].slice(0, 12);

  const teamList = teams.data?.teams ?? [];
  const byMeaning = (m: string) => teamList.filter((tm) => tm.status?.meaning === m).length;
  const stageText = (st: Stage) => t(st === "dispatch" ? "ov.waitTeam" : st === "arrive" ? "ov.waitArrive" : "ov.waitResolve");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("ov.title")}
        description={
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3.5" /> {t("ov.subtitle")}
          </span>
        }
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-muted-foreground text-sm font-semibold uppercase">{t("ov.today")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Tile label={t("ov.requestsToday")} value={s.total} testId="ov-today-total" />
          <Tile label={t("rep.completed")} value={s.completed} sub={t("rep.ofTotal", { pct: pct(s.completionPct) })} />
          <Tile label={t("rep.active")} value={s.open + s.inProgress} sub={t("rep.openSplit", { open: s.open, prog: s.inProgress })} />
          <Tile label={t("rep.avgArrive")} value={`${num(s.arrive.avg)} ${t("rep.min")}`} />
          <Tile label={t("rep.avgResolve")} value={`${num(s.resolve.avg)} ${t("rep.min")}`} />
          <Tile
            label={t("rep.arriveTarget")}
            value={pct(s.arriveMetPct)}
            sub={s.arriveMetPct === null ? undefined : s.arriveMetPct >= 90 ? t("rep.good") : t("rep.needsWork")}
            tone={s.arriveMetPct === null ? undefined : s.arriveMetPct >= 90 ? "good" : "bad"}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-muted-foreground text-sm font-semibold uppercase">{t("ov.now")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Tile label={t("ov.openNow")} value={open.length} />
          <Tile label={t("ov.lateNow")} value={late.length} tone={late.length ? "bad" : undefined} sub={late.length ? t("ov.pastTarget") : t("ov.allOnTime")} testId="ov-late" />
          <Tile label={t("ov.teamsAvailable")} value={`${byMeaning("AVAILABLE")} / ${teamList.length}`} />
          <Tile label={t("ov.teamsMoving")} value={byMeaning("MOVING")} />
          <Tile label={t("ov.teamsEngaged")} value={byMeaning("ENGAGED")} />
          <Tile label={t("ov.teamsOff")} value={byMeaning("OFF_DUTY")} />
        </div>
        {teams.data?.reserve && <ReserveIndicator reserve={teams.data.reserve} />}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="gap-2 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-red-600" /> {t("ov.attention")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {attention.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("ov.nothing")}</p>
            ) : (
              <ul className="grid gap-1" data-testid="ov-attention">
                {attention.map(({ r, l }) => (
                  <li key={r.id}>
                    <Link href={`/requests/${r.id}`} className="hover:bg-accent/40 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm">
                      <span className="font-mono font-semibold">{r.code}</span>
                      <ColorBadge color={r.priority.color}>{label(r.priority)}</ColorBadge>
                      <span>{label(r.issueType)}</span>
                      <span className="text-muted-foreground">
                        {r.zone.code}
                        {r.location ? ` · ${label(r.location)}` : ""}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">{r.assignments.map((a) => a.team.code).join(", ") || "—"}</span>
                      <span className="ml-auto text-xs">
                        {l ? (
                          <span className="font-semibold text-red-700 dark:text-red-400">
                            {stageText(l.stage)} · {t("ov.lateBy", { time: span(l.overMin) })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {label(r.status)} · {formatElapsed(now - Date.parse(r.requestedAt))}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-2 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">{t("ov.links")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 px-4">
            {[
              { href: "/reports", icon: BarChart3, key: "nav.reports" as const },
              { href: "/requests", icon: ClipboardList, key: "nav.requests" as const },
              { href: "/teams", icon: Users, key: "nav.teams" as const },
              { href: "/admin", icon: Settings2, key: "ov.setup" as const },
            ].map((x) => (
              <Button key={x.href} asChild variant="outline" className="justify-start">
                <Link href={x.href}>
                  <x.icon /> {t(x.key)}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
