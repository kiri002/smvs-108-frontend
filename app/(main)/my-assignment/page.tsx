"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Footprints, Hammer, Loader2, MapPin, Phone, PlusCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/common/action-dialog";
import { Empty, ErrorState, Loading } from "@/components/common/states";
import { NotesCard } from "@/components/requests/notes-card";
import { Badge, ColorBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessage, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { postOrQueue } from "@/lib/offline-queue";
import { useMyAssignments, useMyAttendance } from "@/lib/queries";
import { formatElapsed, formatTime, useNow } from "@/lib/time";
import type { MyJob } from "@/lib/types";

function currentPosition(): Promise<{ latitude?: number; longitude?: number }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve({});
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve({}),
      { timeout: 3000, maximumAge: 60_000 },
    );
  });
}

function JobCard({ job, canUpdate, now }: { job: MyJob; canUpdate: boolean; now: number }) {
  const { t, label } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<"resolve" | "manpower" | null>(null);
  const m = job.status.meaning;
  const r = job.request;

  const refresh = () => ["my", "board", "teamBoard", "request"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));

  const step = async (to: "ARRIVED" | "WORKING" | "RESOLVED", extra: Record<string, unknown> = {}) => {
    setBusy(to);
    try {
      const pos = await currentPosition();
      const res = await postOrQueue(`/assignments/${job.id}/progress`, { to, ...pos, ...extra });
      if (res.queued) toast.info(t("common.offline"));
      else toast.success(to === "ARRIVED" ? t("my.goArrived") : to === "WORKING" ? t("my.goWorking") : t("my.goResolved"));
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="gap-3 border-2 py-4" style={{ borderColor: r.priority.color }} data-testid={`job-${r.code}`}>
      <CardHeader className="px-4">
        <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
          <span className="font-mono">{r.code}</span>
          <ColorBadge color={r.priority.color}>{label(r.priority)}</ColorBadge>
          <ColorBadge color={job.status.color}>{label(job.status)}</ColorBadge>
          {r.isDrill && <Badge variant="warning">{t("common.drill")}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 px-4">
        <div className="text-2xl font-bold">{label(r.issueType)}</div>
        {r.description && <p className="text-lg">{r.description}</p>}
        <div className="flex items-start gap-2 text-lg">
          <MapPin className="mt-1 size-5 shrink-0" />
          <div>
            <div className="font-semibold">{r.location ? label(r.location) : label(r.zone)}</div>
            {(r.landmark || r.location?.landmark) && <div className="text-muted-foreground text-base">{r.landmark || r.location?.landmark}</div>}
            <div className="text-muted-foreground text-sm">{r.zone.code}</div>
          </div>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>{t("common.members", { n: r.membersNeeded })}</span>
          <span>{t("my.sinceCall", { n: Math.floor((now - Date.parse(r.requestedAt)) / 60_000) })}</span>
          <span className="font-mono">{formatElapsed(now - Date.parse(job.assignedAt))}</span>
        </div>
        {r.extra.length > 0 && (
          <ul className="text-sm">
            {r.extra.map((x) => (
              <li key={x.code}>
                <span className="font-medium">{label(x)}:</span> {String(x.value)}
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {(r.contactMobile || r.contactName) && (
            <Button asChild variant="outline" size="lg" className="justify-start">
              <a href={r.contactMobile ? `tel:${r.contactMobile}` : undefined}>
                <Phone /> {t("req.contact")}: {r.contactName} {r.contactMobile}
              </a>
            </Button>
          )}
          {r.callerMobile && (
            <Button asChild variant="outline" size="lg" className="justify-start">
              <a href={`tel:${r.callerMobile}`}>
                <Phone /> {t("req.caller")}: {r.callerName} {r.callerMobile}
              </a>
            </Button>
          )}
        </div>

        {canUpdate && !job.releasedAt && (
          <div className="grid gap-2">
            {m === "ASSIGNED" && (
              <Button size="xl" className="h-16 bg-blue-700 text-xl hover:bg-blue-800" disabled={!!busy} onClick={() => void step("ARRIVED").catch(() => {})} data-testid="btn-arrived">
                {busy === "ARRIVED" ? <Loader2 className="animate-spin" /> : <Footprints />} {t("my.goArrived")}
              </Button>
            )}
            {(m === "ASSIGNED" || m === "ARRIVED") && (
              <Button size="xl" variant={m === "ARRIVED" ? "default" : "outline"} className="h-16 text-xl" disabled={!!busy} onClick={() => void step("WORKING").catch(() => {})} data-testid="btn-working">
                {busy === "WORKING" ? <Loader2 className="animate-spin" /> : <Hammer />} {t("my.goWorking")}
              </Button>
            )}
            {(m === "ARRIVED" || m === "WORKING") && (
              <Button size="xl" className="h-16 bg-emerald-700 text-xl hover:bg-emerald-800" disabled={!!busy} onClick={() => setDialog("resolve")} data-testid="btn-resolved">
                <CheckCircle2 /> {t("my.goResolved")}
              </Button>
            )}
            <Button size="lg" variant="outline" className="border-red-600 text-red-700" onClick={() => setDialog("manpower")} data-testid="btn-manpower">
              <UserPlus /> {t("my.needMore")}
            </Button>
          </div>
        )}
        <p className="text-muted-foreground text-xs">
          Sent {formatTime(job.assignedAt)} · {t("req.arrived")} {formatTime(job.arrivedAt)} · {t("req.working")} {formatTime(job.workingAt)}
        </p>
      </CardContent>

      <ActionDialog
        open={dialog === "resolve"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("my.goResolved")}
        fields={[
          { name: "actionTaken", label: t("req.actionTaken"), type: "textarea", required: true },
          { name: "headcount", label: t("req.headcount"), type: "number", required: true },
        ]}
        confirmLabel={t("my.goResolved")}
        onConfirm={async (v) => {
          await step("RESOLVED", { actionTaken: v.actionTaken, headcount: Number(v.headcount) });
        }}
      />
      <ActionDialog
        open={dialog === "manpower"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("my.needMore")}
        fields={[
          { name: "membersAsked", label: t("my.howManyMore"), type: "number", required: true },
          { name: "note", label: t("req.note"), type: "text" },
        ]}
        confirmLabel={t("my.send")}
        onConfirm={async (v) => {
          const res = await postOrQueue(`/assignments/${job.id}/manpower`, { membersAsked: Number(v.membersAsked), note: v.note ?? "" });
          toast.success(res.queued ? t("common.offline") : t("my.needMore"));
          refresh();
        }}
      />
    </Card>
  );
}

export default function MyAssignmentPage() {
  const { t, label } = useI18n();
  const { user, can } = useAuth();
  const qc = useQueryClient();
  const my = useMyAssignments(!!user?.teamId);
  const attendance = useMyAttendance();
  const now = useNow(1000);
  const canUpdate = !!can("EXECUTION", "UPDATE");
  const canRaise = !!can("INTAKE", "CREATE");

  if (!user?.teamId) return <Empty>{t("my.noTeam")}</Empty>;
  if (my.isLoading) return <Loading />;
  if (my.error || !my.data) return <ErrorState error={my.error} onRetry={() => my.refetch()} />;
  const { team, active, recent } = my.data;
  if (!team) return <Empty>{t("my.noTeam")}</Empty>;

  const setStatus = async (statusId: number) => {
    try {
      await post(`/teams/${team.id}/status`, { statusId });
      ["my", "teamBoard"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggleDuty = async () => {
    try {
      await post(attendance.data ? "/teams/attendance/check-out" : "/teams/attendance/check-in");
      ["myAttendance", "teamBoard"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Card className="gap-2 py-4">
        <CardContent className="grid gap-3 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-2xl font-bold">{team.code}</span>
            {team.status && (
              <span className="rounded px-2 py-0.5 text-sm font-bold text-white" style={{ backgroundColor: team.status.color }}>
                {label(team.status)}
              </span>
            )}
            <span className="text-muted-foreground text-sm">
              {team.homeZone.code} · {label(team.homeZone)}
            </span>
          </div>
          {team.standbyPoint && (
            <p className="text-sm">
              <span className="text-muted-foreground">{t("my.standby")}:</span> {label(team.standbyPoint)}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={attendance.data ? "outline" : "default"} onClick={toggleDuty} data-testid="btn-duty">
              {attendance.data ? t("my.checkOut") : t("my.checkIn")}
            </Button>
            <span className="text-muted-foreground text-sm">{attendance.data ? t("my.checkedIn", { time: formatTime(attendance.data.checkInAt) }) : t("my.notCheckedIn")}</span>
          </div>
          {active.length === 0 && can("TEAMS", "EDIT") && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">{t("my.teamStatus")}:</span>
              {(my.data.statuses ?? []).map((s) => (
                <Button key={s.id} size="sm" variant={team.status?.id === s.id ? "default" : "outline"} onClick={() => void setStatus(s.id)}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {label(s)}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {active.length === 0 ? (
        <Empty>{t("my.noJob")}</Empty>
      ) : (
        active.map((job) => (
          <React.Fragment key={job.id}>
            <JobCard job={job} canUpdate={canUpdate} now={now} />
            <NotesCard requestId={job.request.id} assignmentId={job.id} notes={job.notes} canAdd={canUpdate} />
          </React.Fragment>
        ))
      )}

      {canRaise && (
        <Button asChild variant="outline" size="lg">
          <Link href="/requests/new?self=1">
            <PlusCircle /> {t("my.raise")}
          </Link>
        </Button>
      )}

      {recent.length > 0 && (
        <Card className="gap-2 py-4">
          <CardHeader className="px-4">
            <CardTitle>{t("my.recent")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 px-4">
            {recent.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center gap-2 border-b py-1.5 text-sm last:border-0">
                <span className="font-mono font-semibold">{j.request.code}</span>
                <span>{label(j.request.issueType)}</span>
                <ColorBadge color={j.status.color}>{label(j.status)}</ColorBadge>
                <span className="text-muted-foreground ml-auto text-xs">{formatTime(j.releasedAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
