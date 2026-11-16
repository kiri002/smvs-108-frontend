"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/common/action-dialog";
import { ErrorState, Loading, PageHeader } from "@/components/common/states";
import { ReserveIndicator, TeamTile } from "@/components/teams/team-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessage, get, post, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLookups, useTeamBoard } from "@/lib/queries";
import { useNow } from "@/lib/time";
import type { BoardTeam } from "@/lib/types";

type UserRow = { id: number; name: string; mobile: string; teamId: number | null; role: { code: string; labelEn: string } };

function TeamDetail({ team }: { team: BoardTeam }) {
  const { t, label } = useI18n();
  const { can } = useAuth();
  const qc = useQueryClient();
  const lookups = useLookups();
  const canEdit = !!can("TEAMS", "EDIT");
  const [dialog, setDialog] = React.useState<"swap" | null>(null);
  const users = useQuery({ queryKey: ["users", "team"], queryFn: () => get<UserRow[]>("/users"), enabled: !!can("USERS", "VIEW") });
  const manual = (lookups.data?.teamStatuses ?? []).filter((s) => ["AVAILABLE", "OFF_DUTY", "CUSTOM"].includes(s.meaning));
  const refresh = () => ["teamBoard", "my"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
  const run = (p: Promise<unknown>) => p.then(refresh).catch((e) => toast.error(errorMessage(e)));
  const teamUsers = (users.data ?? []).filter((u) => u.teamId === team.id);

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{team.code}</span> <span className="text-muted-foreground font-normal">{label(team)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 px-4 text-sm">
        <div className="grid gap-1">
          {[
            { role: t("teams.leader"), p: team.leader },
            { role: t("teams.deputy"), p: team.deputy },
          ].map(({ role, p }) => (
            <div key={role} className="flex items-center gap-2">
              <span className="text-muted-foreground w-20">{role}</span>
              {p ? (
                <a href={`tel:${p.mobile}`} className="inline-flex items-center gap-1 hover:underline">
                  {p.name} <Phone className="size-3" /> {p.mobile}
                </a>
              ) : (
                <span className="text-destructive">—</span>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {manual.map((s) => (
              <Button key={s.id} size="sm" variant={team.status?.id === s.id ? "default" : "outline"} onClick={() => void run(post(`/teams/${team.id}/status`, { statusId: s.id }))}>
                <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} /> {label(s)}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setDialog("swap")}>
              {t("teams.swap")}
            </Button>
          </div>
        )}
        <div>
          <div className="mb-1 font-semibold">
            {t("teams.people")} ({teamUsers.length})
          </div>
          {teamUsers.length === 0 ? (
            <p className="text-muted-foreground text-xs">{t("teams.noPeople", { n: team.minMembers })}</p>
          ) : (
            <ul className="grid gap-1">
              {teamUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-2">
                  <span>{u.name}</span>
                  <span className="text-muted-foreground text-xs">{u.role.labelEn}</span>
                  <a href={`tel:${u.mobile}`} className="text-muted-foreground ml-auto inline-flex items-center gap-1 text-xs hover:underline">
                    <Phone className="size-3" /> {u.mobile}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
      <ActionDialog
        open={dialog === "swap"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`${team.code} · ${t("teams.swap")}`}
        fields={[
          { name: "leaderUserId", label: t("teams.leader"), type: "select", required: true, options: teamUsers.map((u) => ({ value: String(u.id), label: `${u.name} (${u.role.labelEn})` })) },
          { name: "deputyUserId", label: t("teams.deputy"), type: "select", required: true, options: teamUsers.map((u) => ({ value: String(u.id), label: `${u.name} (${u.role.labelEn})` })) },
        ]}
        confirmLabel={t("common.save")}
        onConfirm={async (v) => {
          await put(`/teams/${team.id}/leadership`, { leaderUserId: Number(v.leaderUserId), deputyUserId: Number(v.deputyUserId) });
          refresh();
        }}
      />
    </Card>
  );
}

export default function TeamsPage() {
  const { t } = useI18n();
  const board = useTeamBoard();
  const now = useNow(1000);
  const [selected, setSelected] = React.useState<number | null>(null);
  const team = board.data?.teams.find((x) => x.id === selected) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("teams.title")} />
      {board.isLoading ? (
        <Loading />
      ) : board.error ? (
        <ErrorState error={board.error} onRetry={() => board.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-3">
            <ReserveIndicator reserve={board.data!.reserve} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {board.data!.teams.map((tm) => (
                <TeamTile key={tm.id} team={tm} now={now} onClick={() => setSelected(tm.id)} />
              ))}
            </div>
          </div>
          <div>{team ? <TeamDetail key={team.id} team={team} /> : <p className="text-muted-foreground text-sm">{t("teams.selectHint")}</p>}</div>
        </div>
      )}
    </div>
  );
}
