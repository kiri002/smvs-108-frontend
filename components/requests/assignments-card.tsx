"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Phone, Shield } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ActionDialog, type ActionField } from "@/components/common/action-dialog";
import { Badge, ColorBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessage, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLookups } from "@/lib/queries";
import { formatTime } from "@/lib/time";
import type { DetailAssignment, RequestDetail } from "@/lib/types";

type Pending = { kind: "recall" | "ARRIVED" | "WORKING" | "RESOLVED"; a: DetailAssignment } | null;

export function AssignmentsCard({ r }: { r: RequestDetail }) {
  const { t, label } = useI18n();
  const { can } = useAuth();
  const qc = useQueryClient();
  const lookups = useLookups();
  const [pending, setPending] = React.useState<Pending>(null);
  const canRecall = !!can("DISPATCH", "EDIT");
  const canOnBehalf = can("EXECUTION", "UPDATE") === "ALL";
  const recallReasons = (lookups.data?.listValues ?? []).filter((l) => l.listName === "RECALL_REASON");
  const refresh = () => ["request", "board", "teamBoard", "suggestions"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));

  const progress = async (a: DetailAssignment, to: string, values: Record<string, string> = {}) => {
    await post(`/assignments/${a.id}/progress`, {
      to,
      actionTaken: values.actionTaken || undefined,
      headcount: values.headcount === undefined || values.headcount === "" ? undefined : Number(values.headcount),
    });
    toast.success(`${a.team.code} · ${to}`);
    refresh();
  };

  const resolvedStatus = lookups.data?.assignmentStatuses.find((s) => s.meaning === "RESOLVED");
  const required = (resolvedStatus?.requiredFields ?? "").split(",").map((s) => s.trim());
  const dialogFields: ActionField[] =
    pending?.kind === "recall"
      ? [{ name: "reasonId", label: t("req.recallReason"), type: "select", required: true, options: recallReasons.map((x) => ({ value: String(x.id), label: label(x) })) }, { name: "note", label: t("req.note"), type: "textarea" }]
      : pending?.kind === "RESOLVED"
        ? [
            { name: "actionTaken", label: t("req.actionTaken"), type: "textarea", required: required.includes("actionTaken") },
            { name: "headcount", label: t("req.headcount"), type: "number", required: required.includes("headcount") },
          ]
        : [];

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>{t("req.assignments")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 px-4">
        {r.assignments.length === 0 && <p className="text-muted-foreground text-sm">{t("req.noAssignments")}</p>}
        {r.assignments.map((a) => {
          const active = !a.releasedAt;
          const m = a.status.meaning;
          return (
            <div key={a.id} className="grid gap-2 rounded-md border p-3" data-testid={`assignment-${a.team.code}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-bold">{a.team.code}</span>
                <ColorBadge color={a.status.color}>{label(a.status)}</ColorBadge>
                {a.viaReserve && (
                  <Badge variant="warning">
                    <Shield /> {t("common.reserve")}
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">{t("common.members", { n: a.membersSent })}</span>
              </div>
              <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-4">
                <span>Sent {formatTime(a.assignedAt)}</span>
                <span>
                  {t("req.arrived")} {formatTime(a.arrivedAt)}
                </span>
                <span>
                  {t("req.working")} {formatTime(a.workingAt)}
                </span>
                <span>Released {formatTime(a.releasedAt)}</span>
              </div>
              {(a.leader || a.deputy) && (
                <div className="flex flex-wrap gap-3 text-sm">
                  {[a.leader && { role: t("teams.leader"), p: a.leader }, a.deputy && { role: t("teams.deputy"), p: a.deputy }]
                    .filter((x): x is { role: string; p: { name: string; mobile: string } } => !!x)
                    .map(({ role, p }) => (
                      <a key={role} href={`tel:${p.mobile}`} className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                        <Phone className="size-3.5" /> {role}: {p.name} ({p.mobile})
                      </a>
                    ))}
                </div>
              )}
              {a.actionTaken && (
                <p className="text-sm">
                  <span className="font-medium">{t("req.actionTaken")}:</span> {a.actionTaken}
                  {a.headcount !== null && ` · ${t("req.headcount")}: ${a.headcount}`}
                </p>
              )}
              {a.overrideReason && <p className="text-muted-foreground text-xs">Override: {label(a.overrideReason)}</p>}
              {a.recallReason && <p className="text-muted-foreground text-xs">Recall: {label(a.recallReason)}</p>}
              {active && (canOnBehalf || canRecall) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {canOnBehalf && m === "ASSIGNED" && (
                    <Button size="sm" variant="outline" onClick={() => void progress(a, "ARRIVED").catch((e) => toast.error(errorMessage(e)))}>
                      {t("req.arrived")}
                    </Button>
                  )}
                  {canOnBehalf && (m === "ASSIGNED" || m === "ARRIVED") && (
                    <Button size="sm" variant="outline" onClick={() => void progress(a, "WORKING").catch((e) => toast.error(errorMessage(e)))}>
                      {t("req.working")}
                    </Button>
                  )}
                  {canOnBehalf && (m === "ARRIVED" || m === "WORKING") && (
                    <Button size="sm" variant="outline" onClick={() => setPending({ kind: "RESOLVED", a })}>
                      {t("req.resolved")}
                    </Button>
                  )}
                  {canRecall && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setPending({ kind: "recall", a })}>
                      {t("req.recall")}
                    </Button>
                  )}
                </div>
              )}
              {active && canOnBehalf && <p className="text-muted-foreground text-[11px]">{t("req.onBehalf")}</p>}
            </div>
          );
        })}
      </CardContent>
      <ActionDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending ? `${pending.a.team.code} · ${pending.kind === "recall" ? t("req.recall") : t("req.resolved")}` : ""}
        fields={dialogFields}
        confirmLabel={pending?.kind === "recall" ? t("req.recall") : t("common.save")}
        destructive={pending?.kind === "recall"}
        onConfirm={async (v) => {
          if (!pending) return;
          if (pending.kind === "recall") {
            await post(`/assignments/${pending.a.id}/recall`, { reasonId: Number(v.reasonId), note: v.note ?? "" });
            toast.success(`${pending.a.team.code} · ${t("req.recall")}`);
            refresh();
          } else {
            await progress(pending.a, pending.kind, v);
          }
        }}
      />
    </Card>
  );
}
