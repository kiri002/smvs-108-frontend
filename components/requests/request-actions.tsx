"use client";

import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { ActionDialog, type ActionField } from "@/components/common/action-dialog";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useBoard, useLookups } from "@/lib/queries";
import type { RequestDetail } from "@/lib/types";

const REASON_LIST: Record<string, string> = { CANCELLED: "CANCEL_REASON", MERGED: "CANCEL_REASON", ON_SITE: "REOPEN_REASON" };

/** Manual status changes allowed by configuration for this user (close, cancel, merge, reopen, custom). */
export function RequestActions({ r }: { r: RequestDetail }) {
  const { t, label } = useI18n();
  const qc = useQueryClient();
  const lookups = useLookups();
  const needsMerge = r.allowedTransitions.some((x) => x.meaning === "MERGED");
  const board = useBoard(false, needsMerge);
  const [active, setActive] = React.useState<RequestDetail["allowedTransitions"][number] | null>(null);

  if (!r.allowedTransitions.length) return null;

  /** Buttons say what they do; the target status keeps its configured label in the dialog. */
  const verb = (tr: RequestDetail["allowedTransitions"][number]) =>
    tr.meaning === "CLOSED"
      ? t("req.do.close")
      : tr.meaning === "CANCELLED"
        ? t("req.do.cancel")
        : tr.meaning === "MERGED"
          ? t("req.do.merge")
          : tr.meaning === "ON_SITE"
            ? t("req.do.reopen")
            : t("req.do.move", { label: label(tr) });

  const fieldsFor = (tr: RequestDetail["allowedTransitions"][number]): ActionField[] => {
    const out: ActionField[] = [];
    if (tr.requiredFields.includes("reason")) {
      const list = REASON_LIST[tr.meaning];
      out.push({
        name: "reasonId",
        label: t("req.reason"),
        type: "select",
        required: true,
        options: (lookups.data?.listValues ?? []).filter((l) => !list || l.listName === list).map((l) => ({ value: String(l.id), label: label(l) })),
      });
    }
    if (tr.meaning === "MERGED" || tr.requiredFields.includes("mergedInto")) {
      out.push({
        name: "mergedIntoId",
        label: t("req.mergeInto"),
        type: "select",
        required: true,
        options: (board.data?.requests ?? []).filter((x) => x.id !== r.id).map((x) => ({ value: String(x.id), label: `${x.code} · ${label(x.issueType)} · ${x.location ? label(x.location) : x.zone.code}` })),
      });
    }
    out.push({ name: "note", label: t("req.note"), type: "textarea", required: tr.requiredFields.includes("note") });
    return out;
  };

  return (
    <div className="flex flex-wrap gap-2" data-testid="request-actions">
      {r.allowedTransitions.map((tr) => (
        <Button
          key={tr.toStatusId}
          variant={tr.meaning === "CLOSED" ? "default" : tr.meaning === "CANCELLED" ? "destructive" : "outline"}
          size={tr.meaning === "CLOSED" ? "lg" : "default"}
          onClick={() => setActive(tr)}
        >
          {verb(tr)}
        </Button>
      ))}
      <ActionDialog
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        title={active ? `${r.code} → ${label(active)}` : ""}
        fields={active ? fieldsFor(active) : []}
        confirmLabel={active ? verb(active) : t("common.confirm")}
        destructive={active?.meaning === "CANCELLED"}
        onConfirm={async (v) => {
          if (!active) return;
          await post(`/requests/${r.id}/transition`, {
            toStatusId: active.toStatusId,
            reasonId: v.reasonId ? Number(v.reasonId) : null,
            mergedIntoId: v.mergedIntoId ? Number(v.mergedIntoId) : null,
            note: v.note ?? "",
          });
          toast.success(`${r.code} → ${label(active)}`);
          ["request", "board", "teamBoard", "suggestions", "requests"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
        }}
      />
    </div>
  );
}
