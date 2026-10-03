"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/common/action-dialog";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/common/states";
import { Badge, ColorBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { post } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useReleases } from "@/lib/queries";
import { formatDateTime } from "@/lib/time";
import type { ReserveRelease } from "@/lib/types";

/** Spec 5.3: the 108 Head approves or rejects reserve release. */
export default function ApprovalsPage() {
  const { t, label } = useI18n();
  const qc = useQueryClient();
  const all = useReleases(false);
  const [deciding, setDeciding] = React.useState<{ r: ReserveRelease; approve: boolean } | null>(null);
  const pending = (all.data ?? []).filter((r) => r.decision === "PENDING");
  const decided = (all.data ?? []).filter((r) => r.decision !== "PENDING");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("approvals.title")} />
      {all.isLoading ? (
        <Loading />
      ) : all.error ? (
        <ErrorState error={all.error} onRetry={() => all.refetch()} />
      ) : (
        <>
          {pending.length === 0 ? (
            <Empty>{t("approvals.none")}</Empty>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pending.map((r) => (
                <Card key={r.id} className="gap-2 border-2 border-amber-400 py-4" data-testid={`release-${r.id}`}>
                  <CardContent className="grid gap-2 px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-lg font-bold">{r.team.code}</span>
                      <span>→</span>
                      <Link href={`/requests/${r.request.id}`} className="font-mono font-semibold underline">
                        {r.request.code}
                      </Link>
                      <ColorBadge color={r.request.priority.color}>{label(r.request.priority)}</ColorBadge>
                    </div>
                    <div className="text-sm">
                      {label(r.request.issueType)} · {r.request.location ? label(r.request.location) : r.request.zone.code}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {r.requestedBy} · {formatDateTime(r.requestedAt)} · {t("common.members", { n: r.membersSent })}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800" size="lg" onClick={() => setDeciding({ r, approve: true })}>
                        <Check /> {t("approvals.approve")}
                      </Button>
                      <Button className="flex-1" variant="destructive" size="lg" onClick={() => setDeciding({ r, approve: false })}>
                        <X /> {t("approvals.reject")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {decided.length > 0 && (
            <div className="grid gap-2">
              <h2 className="text-muted-foreground text-sm font-semibold uppercase">{t("approvals.history")}</h2>
              {decided.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                  <Badge variant={r.decision === "REJECTED" ? "destructive" : r.decision === "AUTO" ? "warning" : "success"}>{r.decision}</Badge>
                  <span className="font-mono">{r.team.code}</span>→
                  <Link href={`/requests/${r.request.id}`} className="font-mono underline">
                    {r.request.code}
                  </Link>
                  <span className="text-muted-foreground">
                    {r.decidedBy ?? r.requestedBy} · {formatDateTime(r.decidedAt ?? r.requestedAt)}
                  </span>
                  {r.note && <span className="text-muted-foreground">· {r.note}</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <ActionDialog
        open={!!deciding}
        onOpenChange={(o) => !o && setDeciding(null)}
        title={deciding ? `${deciding.approve ? t("approvals.approve") : t("approvals.reject")}: ${deciding.r.team.code} → ${deciding.r.request.code}` : ""}
        fields={[{ name: "note", label: t("req.note"), type: "text" }]}
        confirmLabel={deciding?.approve ? t("approvals.approve") : t("approvals.reject")}
        destructive={deciding ? !deciding.approve : false}
        onConfirm={async (v) => {
          if (!deciding) return;
          await post(`/reserve-releases/${deciding.r.id}/decide`, { approve: deciding.approve, note: v.note ?? "" });
          toast.success(deciding.approve ? t("approvals.approve") : t("approvals.reject"));
          ["releases", "request", "board", "teamBoard"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
        }}
      />
    </div>
  );
}
