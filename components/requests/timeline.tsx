"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { formatDateTime } from "@/lib/time";
import type { HistoryRow } from "@/lib/types";

const ACTION_LABEL: Record<string, string> = {
  CREATED: "Request created",
  EDITED: "Edited",
  STATUS: "Status",
  ASSIGNED: "Team sent",
  ARRIVED: "Arrived",
  WORKING: "Working",
  RESOLVED: "Resolved",
  RECALLED: "Recalled",
  NOTE: "Note",
  PHOTO: "Photo",
  MANPOWER_REQUESTED: "More manpower asked",
  MANPOWER_HANDLED: "Manpower ask handled",
  RESERVE_REQUESTED: "Reserve requested",
  RESERVE_APPROVED: "Reserve approved",
  RESERVE_REJECTED: "Reserve rejected",
  RESERVE_AUTO: "Reserve used (urgent)",
  CANCELLED: "Cancelled",
  MERGED: "Merged",
  CLOSED: "Closed",
  REOPENED: "Reopened",
};

/** Every change with who and when (spec rule 8). */
export function Timeline({ history }: { history: HistoryRow[] }) {
  const { t } = useI18n();
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>{t("req.history")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <ol className="relative grid gap-3 border-l pl-4">
          {history.map((h) => (
            <li key={h.id} className="relative text-sm">
              <span className="bg-primary absolute top-1.5 -left-[21px] size-2.5 rounded-full" />
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{ACTION_LABEL[h.action] ?? h.action}</span>
                {(h.fromLabel || h.toLabel) && (
                  <span className="text-muted-foreground">
                    {h.fromLabel && `${h.fromLabel} → `}
                    {h.toLabel}
                  </span>
                )}
              </div>
              {h.detail && <div className="text-muted-foreground break-words">{h.detail}</div>}
              <div className="text-muted-foreground text-xs">
                {formatDateTime(h.at)}
                {h.by && ` · ${h.by}`}
                {h.onBehalf && " · on behalf of the team"}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
