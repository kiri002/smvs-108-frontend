"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { ErrorState, Loading } from "@/components/common/states";
import { AssignmentsCard } from "@/components/requests/assignments-card";
import { DispatchPanel } from "@/components/requests/dispatch-panel";
import { EditRequestDialog } from "@/components/requests/edit-request-dialog";
import { NotesCard } from "@/components/requests/notes-card";
import { RequestActions } from "@/components/requests/request-actions";
import { RequestTags, RequestTimers } from "@/components/requests/request-card";
import { Timeline } from "@/components/requests/timeline";
import { ColorBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessage, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useRequest } from "@/lib/queries";
import { formatDateTime, formatTime, useNow } from "@/lib/time";
import type { BoardRequest } from "@/lib/types";

function Fact({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground font-medium">{k}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function Phoneable({ name, mobile }: { name: string; mobile: string }) {
  if (!name && !mobile) return <>—</>;
  return (
    <span>
      {name}
      {mobile && (
        <a href={`tel:${mobile}`} className="ml-2 inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline">
          <Phone className="size-3.5" />
          {mobile}
        </a>
      )}
    </span>
  );
}

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { t, label } = useI18n();
  const { can, user } = useAuth();
  const qc = useQueryClient();
  const q = useRequest(id);
  const now = useNow(1000);

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const r = q.data;
  const terminal = r.status.behaviour === "TERMINAL";
  const canDispatch = !!can("DISPATCH", "CREATE") && !terminal;
  const onTeam = r.assignments.some((a) => a.team.id === user?.teamId);
  const canNote = !terminal && (!!can("DISPATCH", "EDIT") || can("EXECUTION", "UPDATE") === "ALL" || (onTeam && !!can("EXECUTION", "UPDATE")));
  const pendingManpower = r.manpower.filter((m) => !m.handledAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label={t("common.back")}>
          <Link href="/control-room">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="font-mono text-2xl font-bold">{r.code}</h1>
        <ColorBadge color={r.priority.color} className="text-sm">
          {label(r.priority)}
        </ColorBadge>
        <ColorBadge color={r.status.color} className="text-sm" data-testid="request-status">
          {label(r.status)}
        </ColorBadge>
        <RequestTags r={r} />
        <div className="ml-auto flex flex-wrap gap-2">
          {!terminal && can("INTAKE", "EDIT") && <EditRequestDialog r={r} />}
          <RequestActions r={r} />
        </div>
      </div>

      <RequestTimers r={r as unknown as BoardRequest} now={now} amberPct={r.timerAmberPct} size="lg" />
      {r.mergedInto && (
        <p className="text-sm">
          {t("req.mergedInto", { code: "" })}{" "}
          <Link className="font-mono font-semibold underline" href={`/requests/${r.mergedInto.id}`}>
            {r.mergedInto.code}
          </Link>
        </p>
      )}
      {r.reason && (
        <p className="text-sm">
          <span className="font-medium">{t("req.reason")}:</span> {label(r.reason)} {r.reasonNote && `· ${r.reasonNote}`}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="gap-2 py-4">
            <CardHeader className="px-4">
              <CardTitle>{t("req.facts")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <Fact k={t("req.what")}>
                <span className="font-semibold">{label(r.issueType)}</span>
                {r.description && ` · ${r.description}`}
              </Fact>
              <Fact k={t("req.where")}>
                {r.location ? label(r.location) : label(r.zone)}{" "}
                <span className="rounded px-1.5 text-xs font-semibold text-white" style={{ backgroundColor: r.zone.color }}>
                  {r.zone.code}
                </span>
                {r.landmark && ` · ${r.landmark}`}
              </Fact>
              <Fact k={t("req.howMany")}>{t("common.members", { n: r.membersNeeded })}</Fact>
              <Fact k={t("req.urgency")}>{label(r.priority)}</Fact>
              <Fact k={t("req.caller")}>
                <Phoneable name={r.callerName} mobile={r.callerMobile} />
                {r.department && <span className="text-muted-foreground"> · {label(r.department)}</span>}
              </Fact>
              <Fact k={t("req.contact")}>
                <Phoneable name={r.contactName} mobile={r.contactMobile} />
              </Fact>
              {r.extraFieldsLabelled.map((x) => (
                <Fact key={x.code} k={label(x)}>
                  {typeof x.value === "boolean" ? (x.value ? t("common.yes") : t("common.no")) : String(x.value ?? "—")}
                </Fact>
              ))}
              <p className="text-muted-foreground pt-2 text-xs">
                {formatDateTime(r.requestedAt)} · {t("req.createdBy", { name: r.createdBy })}
                {r.closedBy && ` · ${t("req.closedBy", { name: r.closedBy })} ${formatTime(r.closedAt)}`}
              </p>
            </CardContent>
          </Card>

          {pendingManpower.length > 0 && (
            <Card className="gap-2 border-red-600 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-red-700">{t("req.manpower")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 px-4">
                {pendingManpower.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">+{m.membersAsked}</span>
                    <span>
                      {m.by} · {formatTime(m.at)}
                    </span>
                    {m.note && <span className="text-muted-foreground">· {m.note}</span>}
                    {can("DISPATCH", "CREATE") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto"
                        onClick={() =>
                          void post(`/manpower/${m.id}/handle`)
                            .then(() => qc.invalidateQueries({ queryKey: ["request"] }))
                            .catch((e) => toast.error(errorMessage(e)))
                        }
                      >
                        {t("req.markHandled")}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {canDispatch && <DispatchPanel requestId={r.id} />}
          <AssignmentsCard r={r} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <NotesCard requestId={r.id} notes={r.notes} canAdd={canNote} />
          <Timeline history={r.history} />
        </div>
      </div>
    </div>
  );
}
