"use client";

import { Monitor, PhoneCall } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Empty, ErrorState, Loading, PageHeader } from "@/components/common/states";
import { DrillControls } from "@/components/requests/drill-controls";
import { RequestCard } from "@/components/requests/request-card";
import { ReserveIndicator, TeamTile } from "@/components/teams/team-tile";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/form";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useBoard, useLookups, useTeamBoard } from "@/lib/queries";
import { useNow } from "@/lib/time";

export default function ControlRoomPage() {
  const { t, label } = useI18n();
  const { can } = useAuth();
  const [recent, setRecent] = React.useState(false);
  const [zone, setZone] = React.useState("");
  const board = useBoard(recent);
  const teams = useTeamBoard(!!can("TEAMS", "VIEW") || !!can("TRACKING", "VIEW"));
  const lookups = useLookups();
  const now = useNow(1000);

  const requests = (board.data?.requests ?? []).filter((r) => !zone || String(r.zone.id) === zone);
  const teamList = (teams.data?.teams ?? []).filter((tm) => !zone || String(tm.homeZone.id) === zone || tm.isReserve);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("nav.controlRoom")}
        actions={
          <>
            {can("INTAKE", "CREATE") && (
              <Button asChild size="lg">
                <Link href="/requests/new">
                  <PhoneCall /> {t("nav.newRequest")}
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg">
              <Link href="/display" target="_blank">
                <Monitor /> {t("nav.display")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={zone} onChange={(e) => setZone(e.target.value)} className="w-auto" aria-label={t("intake.zone")}>
          <option value="">
            {t("intake.zone")}: {t("common.all")}
          </option>
          {lookups.data?.zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.code} · {label(z)}
            </option>
          ))}
        </Select>
        <Checkbox checked={recent} onChange={(e) => setRecent(e.target.checked)} label={t("board.recent")} />
        <div className="ml-auto">
          <DrillControls />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase">
            {t("board.requests")} ({requests.filter((r) => r.status.behaviour !== "TERMINAL").length})
          </h2>
          {board.isLoading ? (
            <Loading />
          ) : board.error ? (
            <ErrorState error={board.error} onRetry={() => board.refetch()} />
          ) : requests.length === 0 ? (
            <Empty>{t("board.noRequests")}</Empty>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {requests.map((r) => (
                <RequestCard key={r.id} r={r} now={now} amberPct={board.data!.timerAmberPct} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase">{t("board.teams")}</h2>
          {teams.data && <ReserveIndicator reserve={teams.data.reserve} />}
          {teams.isLoading ? (
            <Loading />
          ) : teams.error ? (
            <ErrorState error={teams.error} onRetry={() => teams.refetch()} />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
              {teamList.map((tm) => (
                <TeamTile key={tm.id} team={tm} now={now} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
