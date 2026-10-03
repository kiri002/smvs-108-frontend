"use client";

import { Maximize } from "lucide-react";
import * as React from "react";

import { AuthGuard } from "@/components/layout/auth-guard";
import { RequestCard } from "@/components/requests/request-card";
import { ReserveIndicator, TeamTile } from "@/components/teams/team-tile";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useBoard, useLookups, useTeamBoard } from "@/lib/queries";
import { formatTime, useNow } from "@/lib/time";

/** FR-M7-05: wall display for the Control Room, readable from a distance. */
function Display() {
  const { t } = useI18n();
  const board = useBoard(false);
  const teams = useTeamBoard();
  const lookups = useLookups();
  const now = useNow(1000);
  const open = board.data?.requests ?? [];

  const fullscreen = () => {
    void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="bg-background flex min-h-dvh flex-col gap-4 p-4">
      <header className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-red-700 text-lg font-bold text-white">108</div>
        <div>
          <div className="text-2xl font-bold">{t("nav.controlRoom")}</div>
          <div className="text-muted-foreground">{lookups.data?.event?.name}</div>
        </div>
        {lookups.data?.settings.drillMode && <div className="rounded-lg bg-amber-400 px-4 py-2 text-xl font-bold text-amber-950">{t("common.drill")}</div>}
        <div className="ml-auto font-mono text-4xl font-bold tabular-nums">{formatTime(new Date(now))}</div>
        <Button variant="outline" size="icon-lg" onClick={fullscreen} aria-label="Full screen">
          <Maximize />
        </Button>
      </header>
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-xl font-semibold">
            {t("board.requests")} ({open.length})
          </h2>
          {open.length === 0 ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-xl border-2 border-dashed text-3xl">{t("board.noRequests")}</div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {open.map((r) => (
                <RequestCard key={r.id} r={r} now={now} amberPct={board.data!.timerAmberPct} large />
              ))}
            </div>
          )}
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{t("board.teams")}</h2>
          {teams.data && <ReserveIndicator reserve={teams.data.reserve} />}
          <div className="grid grid-cols-2 gap-3">
            {teams.data?.teams.map((tm) => (
              <TeamTile key={tm.id} team={tm} now={now} large />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DisplayPage() {
  return (
    <AuthGuard>
      <Display />
    </AuthGuard>
  );
}
