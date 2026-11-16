"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Shield } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState, Loading } from "@/components/common/states";
import { Badge, ColorBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { errorMessage, post } from "@/lib/api";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { useLookups, useSuggestions } from "@/lib/queries";
import type { Suggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

type Pick = { membersSent: string; overrideReasonId: string };
type AssignResult = { results: { code: string; outcome: "ASSIGNED"; warning?: string }[] };

/** M6: suggested teams in the configured order; the CR can pick several or override. */
export function DispatchPanel({ requestId }: { requestId: number }) {
  const { t, label } = useI18n();
  const qc = useQueryClient();
  const plan = useSuggestions(requestId, true);
  const lookups = useLookups();
  const [picked, setPicked] = React.useState<Record<number, Pick>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const seeded = React.useRef<string>("");

  // Pre-select what the server suggests whenever the suggestion list changes.
  React.useEffect(() => {
    if (!plan.data) return;
    const sig = plan.data.suggestions.map((s) => `${s.teamId}:${s.preselected}`).join(",");
    if (sig === seeded.current) return;
    seeded.current = sig;
    const next: Record<number, Pick> = {};
    for (const s of plan.data.suggestions) if (s.preselected) next[s.teamId] = { membersSent: String(s.membersOnDuty), overrideReasonId: "" };
    setPicked(next);
  }, [plan.data]);

  const overrideReasons = (lookups.data?.listValues ?? []).filter((l) => l.listName === "OVERRIDE_REASON");
  const reason = (s: Suggestion) => t(s.reasonKey as MessageKey, s.reasonParams) || s.reason;

  const toggle = (s: Suggestion) =>
    setPicked((p) => {
      const n = { ...p };
      if (n[s.teamId]) delete n[s.teamId];
      else n[s.teamId] = { membersSent: String(s.membersOnDuty), overrideReasonId: "" };
      return n;
    });

  const assign = async () => {
    if (!plan.data) return;
    setError(null);
    const order = plan.data.suggestions.filter((s) => picked[s.teamId]);
    const missing = order.find((s) => s.requiresOverride && !picked[s.teamId].overrideReasonId);
    if (missing) return setError(`${missing.code}: ${t("req.overrideReason")} — ${t("common.required")}`);
    setBusy(true);
    try {
      const res = await post<AssignResult>(`/requests/${requestId}/assign`, {
        teams: order.map((s) => ({
          teamId: s.teamId,
          membersSent: picked[s.teamId].membersSent ? Number(picked[s.teamId].membersSent) : undefined,
          overrideReasonId: picked[s.teamId].overrideReasonId || null,
        })),
      });
      for (const r of res.results) {
        toast.success(`${r.code} → ${t("board.dispatch")}`);
        if (r.warning) toast.warning(r.warning);
      }
      seeded.current = "";
      await Promise.all(["request", "suggestions", "board", "teamBoard"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    } catch (err) {
      setError(errorMessage(err));
      void qc.invalidateQueries({ queryKey: ["suggestions"] });
    } finally {
      setBusy(false);
    }
  };

  const groups: { key: string; title: string; items: Suggestion[] }[] = plan.data
    ? [
        { key: "main", title: t("req.suggested"), items: plan.data.suggestions.filter((s) => s.tier !== "OTHER") },
        { key: "other", title: t("req.otherTeams"), items: plan.data.suggestions.filter((s) => s.tier === "OTHER") },
      ]
    : [];

  return (
    <Card className="gap-3 border-2 border-red-700/40 py-4" data-testid="dispatch-panel">
      <CardHeader className="px-4">
        <CardTitle className="flex flex-wrap items-center gap-2">
          {t("req.dispatch")}
          {plan.data && plan.data.remainingGap > 0 && <Badge variant="warning">{t("req.gap", { n: plan.data.remainingGap })}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 px-4">
        {plan.isLoading && <Loading />}
        {plan.error && <ErrorState error={plan.error} onRetry={() => plan.refetch()} />}
        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <div key={g.key} className="grid gap-2">
                <div className="text-muted-foreground text-xs font-semibold uppercase">{g.title}</div>
                {g.items.map((s) => {
                  const on = !!picked[s.teamId];
                  return (
                    <div
                      key={s.teamId}
                      className={cn("grid gap-2 rounded-md border p-2.5 transition-colors", on ? "border-primary bg-primary/5" : "hover:bg-accent/40")}
                      data-testid={`suggestion-${s.code}`}
                    >
                      <label className="flex cursor-pointer items-center gap-3">
                        <input type="checkbox" className="accent-primary size-5" checked={on} onChange={() => toggle(s)} aria-label={s.code} />
                        <span className="font-mono text-base font-bold">{s.code}</span>
                        {s.tier === "RESERVE" && <Shield className="size-4" />}
                        <span className="flex-1 text-sm">{reason(s)}</span>
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                          {t("req.membersOnDuty", { n: s.membersOnDuty })}
                          {s.membersEstimated && ` (${t("req.estimated")})`}
                        </span>
                      </label>
                      {on && (
                        <div className="flex flex-wrap items-center gap-2 pl-8">
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            className="h-8 w-24"
                            aria-label={t("req.membersSent")}
                            value={picked[s.teamId].membersSent}
                            onChange={(e) => setPicked({ ...picked, [s.teamId]: { ...picked[s.teamId], membersSent: e.target.value } })}
                          />
                          <span className="text-muted-foreground text-xs">{t("req.membersSent")}</span>
                          {s.requiresOverride && (
                            <Select
                              className="h-8 w-auto"
                              aria-label={t("req.overrideReason")}
                              value={picked[s.teamId].overrideReasonId}
                              onChange={(e) => setPicked({ ...picked, [s.teamId]: { ...picked[s.teamId], overrideReasonId: e.target.value } })}
                            >
                              <option value="">{t("req.overrideReason")}…</option>
                              {overrideReasons.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {label(r)}
                                </option>
                              ))}
                            </Select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ),
        )}
        {plan.data && plan.data.suggestions.length === 0 && <p className="text-sm font-medium text-red-700">{t("req.unavailable")}: {t("common.none")}</p>}
        {plan.data && plan.data.unavailable.length > 0 && (
          <details className="text-sm">
            <summary className="text-muted-foreground cursor-pointer text-xs font-semibold uppercase">
              {t("req.unavailable")} ({plan.data.unavailable.length})
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {plan.data.unavailable.map((u) => (
                <ColorBadge key={u.teamId} color={u.status?.color}>
                  {u.code} · {u.status ? label(u.status) : "—"}
                </ColorBadge>
              ))}
            </div>
          </details>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm font-medium">
            {error}
          </p>
        )}
        <Button size="xl" onClick={assign} disabled={busy || Object.keys(picked).length === 0} data-testid="assign-button">
          {busy ? <Loader2 className="animate-spin" /> : <Send />}
          {t("req.assignSelected")} ({Object.keys(picked).length})
        </Button>
      </CardContent>
    </Card>
  );
}
