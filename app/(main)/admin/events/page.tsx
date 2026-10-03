"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Radio, Square } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/common/action-dialog";
import { ErrorState, Loading, PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { errorMessage, post } from "@/lib/api";
import { useAdminEvent, type EventRow } from "@/lib/admin";
import { useAuth } from "@/lib/auth";

/** FR-M2-01 / FR-M1-05: events, go live, close, clone for the next Mahotsav. */
export default function EventsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { events, choose } = useAdminEvent();
  const [dialog, setDialog] = React.useState<{ kind: "create" | "clone"; from?: EventRow } | null>(null);
  const canEdit = !!can("CONFIG", "CONFIGURE");
  const refresh = () => ["events", "lookups", "config", "board", "teamBoard"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
  const run = (p: Promise<unknown>, msg: string) =>
    p
      .then(() => {
        toast.success(msg);
        refresh();
      })
      .catch((e) => toast.error(errorMessage(e)));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Events"
        description="Only one event is live at a time. Clone an event to start the next Mahotsav with the same setup."
        actions={
          canEdit && (
            <Button onClick={() => setDialog({ kind: "create" })}>
              <Plus /> New event
            </Button>
          )
        }
      />
      {events.isLoading ? (
        <Loading />
      ) : events.error ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : (
        <div className="grid gap-2">
          {events.data?.map((ev) => (
            <div key={ev.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-semibold">
                  {ev.name}
                  <Badge variant={ev.status === "LIVE" ? "destructive" : ev.status === "DRAFT" ? "secondary" : "outline"}>{ev.status}</Badge>
                </div>
                <div className="text-muted-foreground text-sm">
                  {ev.code} · {ev.startDate.slice(0, 10)} → {ev.endDate.slice(0, 10)} · {ev.timezone}
                </div>
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => choose(String(ev.id))}>
                    Edit its configuration
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "clone", from: ev })}>
                    <Copy /> Clone
                  </Button>
                  {ev.status !== "LIVE" && (
                    <Button size="sm" onClick={() => void run(post(`/events/${ev.id}/go-live`), `${ev.name} is live`)}>
                      <Radio /> Go live
                    </Button>
                  )}
                  {ev.status === "LIVE" && (
                    <Button size="sm" variant="destructive" onClick={() => void run(post(`/events/${ev.id}/close`), `${ev.name} closed`)}>
                      <Square /> Close event
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ActionDialog
        open={!!dialog}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.kind === "clone" ? `Clone ${dialog.from?.name}` : "New event"}
        description={dialog?.kind === "clone" ? "Copies every configuration list with new IDs. Requests and logs are not copied." : "Creates an empty draft event."}
        fields={[
          { name: "code", label: "Code (e.g. MAHOTSAV-2027)", type: "text", required: true },
          { name: "name", label: "Name", type: "text", required: true },
          { name: "startDate", label: "Start date (YYYY-MM-DD)", type: "text", required: true },
          { name: "endDate", label: "End date (YYYY-MM-DD)", type: "text", required: true },
          ...(dialog?.kind === "clone"
            ? [{ name: "moveUsers", label: "Move users to the new event's teams", type: "select" as const, options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }] }]
            : []),
        ]}
        confirmLabel={dialog?.kind === "clone" ? "Clone" : "Create"}
        onConfirm={async (v) => {
          if (dialog?.kind === "clone") {
            await post(`/events/${dialog.from!.id}/clone`, { code: v.code, name: v.name, startDate: v.startDate, endDate: v.endDate, moveUsers: v.moveUsers === "yes" });
            toast.success("Event cloned");
          } else {
            await post("/events", { code: v.code, name: v.name, startDate: v.startDate, endDate: v.endDate });
            toast.success("Event created");
          }
          refresh();
        }}
      />
    </div>
  );
}
