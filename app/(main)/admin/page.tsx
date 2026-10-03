"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ErrorState, Loading, PageHeader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessage, get, post } from "@/lib/api";
import { useAdminEvent, useConfigMeta } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { useLookups } from "@/lib/queries";

type SetupCheck = { ok: boolean; errors: number; warnings: number; issues: { severity: "error" | "warning"; area: string; message: string; link: string }[] };

export default function AdminOverviewPage() {
  const { current } = useAdminEvent();
  const { can } = useAuth();
  const qc = useQueryClient();
  const meta = useConfigMeta();
  const lookups = useLookups();
  const check = useQuery({
    queryKey: ["setup", current?.id],
    queryFn: () => get<SetupCheck>(`/events/${current!.id}/setup-check`),
    enabled: !!current,
  });
  const canDrill = !!can("AUDIT", "CREATE") || !!can("CONFIG", "CONFIGURE");
  const drill = lookups.data?.settings.drillMode ?? false;

  const groups = (meta.data ?? []).reduce<Record<string, typeof meta.data>>((acc, e) => {
    (acc[e.group] ??= []).push(e);
    return acc;
  }, {});

  const setDrill = async (enabled: boolean) => {
    try {
      await post("/events/live/drill-mode", { enabled });
      toast.success(enabled ? "Drill mode on" : "Drill mode off");
      void qc.invalidateQueries({ queryKey: ["lookups"] });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const clearDrills = async () => {
    try {
      const r = await post<{ removed: number }>("/events/live/clear-drills");
      toast.success(`${r.removed} drill request(s) removed`);
      ["board", "requests"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Admin" description={current ? `${current.name} · ${current.status}` : undefined} />

      <Card className="gap-3 py-4" data-testid="setup-check">
        <CardHeader className="px-4">
          <CardTitle className="flex items-center gap-2">
            Setup check
            {check.data &&
              (check.data.ok ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="size-4" /> Ready
                </span>
              ) : (
                <span className="text-destructive inline-flex items-center gap-1 text-sm font-medium">
                  <AlertCircle className="size-4" /> {check.data.errors} error(s)
                </span>
              ))}
            {check.data && check.data.warnings > 0 && <span className="text-sm font-medium text-amber-700">{check.data.warnings} warning(s)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {check.isLoading ? (
            <Loading />
          ) : check.error ? (
            <ErrorState error={check.error} onRetry={() => check.refetch()} />
          ) : check.data?.issues.length === 0 ? (
            <p className="text-sm">Every zone has a location, standby point and primary team; statuses, targets and reserve policy are set.</p>
          ) : (
            <ul className="grid gap-1.5 text-sm">
              {check.data?.issues.map((i, n) => (
                <li key={n} className="flex items-start gap-2">
                  {i.severity === "error" ? <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />}
                  <span className="text-muted-foreground w-20 shrink-0">{i.area}</span>
                  <Link href={i.link} className="hover:underline">
                    {i.message}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canDrill && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle>Drill mode</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 px-4 text-sm">
            <span>
              Drill mode is <b>{drill ? "ON" : "OFF"}</b> for the live event. While on, every new request is tagged as a drill and left out of reports.
            </span>
            <Button variant={drill ? "outline" : "default"} onClick={() => void setDrill(!drill)} data-testid="drill-toggle">
              {drill ? "Turn off" : "Turn on"}
            </Button>
            <Button variant="outline" onClick={() => void clearDrills()}>
              Remove drill requests
            </Button>
          </CardContent>
        </Card>
      )}

      {meta.isLoading ? (
        <Loading />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(groups).map(([group, items]) => (
            <Card key={group} className="gap-2 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-base">{group}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1 px-4">
                {items!.map((e) => (
                  <Link key={e.key} href={`/admin/config/${e.key}`} className="hover:bg-accent rounded px-2 py-1 text-sm">
                    {e.label}
                  </Link>
                ))}
                {group === "People and access" && (
                  <>
                    <Link href="/admin/users" className="hover:bg-accent rounded px-2 py-1 text-sm">
                      Users
                    </Link>
                    <Link href="/admin/permissions" className="hover:bg-accent rounded px-2 py-1 text-sm">
                      Permission matrix
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
