"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Empty, ErrorState, Loading } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { post } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAlerts } from "@/lib/queries";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

/** The bell: unread count, and the alert list in a side panel (replaces the separate Alerts page). */
export function AlertsBell({ enabled }: { enabled: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const alerts = useAlerts(enabled);
  const [open, setOpen] = useState(false);
  const unread = alerts.data?.unread ?? 0;
  const refresh = () => void qc.invalidateQueries({ queryKey: ["alerts"] });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("nav.alerts")} data-testid="alerts-bell">
          <Bell />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{t("alerts.title")}</SheetTitle>
          <SheetDescription className="flex items-center justify-between gap-2">
            <span>{unread > 0 ? t("alerts.unread", { n: unread }) : t("alerts.allRead")}</span>
            {unread > 0 && (
              <Button variant="outline" size="sm" onClick={() => void post("/alerts/read-all").then(refresh)}>
                <CheckCheck /> {t("alerts.markAll")}
              </Button>
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-3">
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
                    onClick={() => {
                      if (!a.readAt) void post(`/alerts/${a.id}/read`).then(refresh);
                      setOpen(false);
                    }}
                    className={cn(
                      "hover:bg-accent/40 flex flex-col gap-0.5 rounded-lg border p-3",
                      !a.readAt && "border-l-4 border-l-red-600 bg-red-50/50 dark:bg-red-950/20",
                    )}
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
      </SheetContent>
    </Sheet>
  );
}
