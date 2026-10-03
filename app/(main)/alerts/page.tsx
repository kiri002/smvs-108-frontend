"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import Link from "next/link";

import { Empty, ErrorState, Loading, PageHeader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAlerts } from "@/lib/queries";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export default function AlertsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const alerts = useAlerts();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["alerts"] });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("alerts.title")}
        actions={
          (alerts.data?.unread ?? 0) > 0 && (
            <Button variant="outline" onClick={() => void post("/alerts/read-all").then(refresh)}>
              <CheckCheck /> {t("alerts.markAll")}
            </Button>
          )
        }
      />
      {alerts.isLoading ? (
        <Loading />
      ) : alerts.error ? (
        <ErrorState error={alerts.error} onRetry={() => alerts.refetch()} />
      ) : !alerts.data?.items.length ? (
        <Empty>{t("alerts.none")}</Empty>
      ) : (
        <ul className="grid gap-2">
          {alerts.data.items.map((a) => (
            <li key={a.id}>
              <Link
                href={a.link || "#"}
                onClick={() => !a.readAt && void post(`/alerts/${a.id}/read`).then(refresh)}
                className={cn("hover:bg-accent/40 flex flex-col gap-0.5 rounded-lg border p-3", !a.readAt && "border-l-4 border-l-red-600 bg-red-50/50 dark:bg-red-950/20")}
              >
                <span className="font-semibold">{a.title}</span>
                {a.body && <span className="text-muted-foreground text-sm">{a.body}</span>}
                <span className="text-muted-foreground text-xs">{formatDateTime(a.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
