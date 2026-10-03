"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { errorMessage, patch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLookups } from "@/lib/queries";
import type { RequestDetail } from "@/lib/types";

import { ExtraFields, type ExtraValues } from "./extra-fields";
import { LocationPicker } from "./location-picker";

/** FR-M5-10: edit a request that is not final. Only changed fields are sent and logged. */
export function EditRequestDialog({ r }: { r: RequestDetail }) {
  const { t, label } = useI18n();
  const qc = useQueryClient();
  const lookups = useLookups();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const initial = React.useMemo(
    () => ({
      locationId: r.locationId,
      zoneId: String(r.zoneId),
      issueTypeId: String(r.issueTypeId),
      priorityId: String(r.priorityId),
      membersNeeded: String(r.membersNeeded),
      description: r.description,
      landmark: r.landmark,
      callerName: r.callerName,
      callerMobile: r.callerMobile,
      contactName: r.contactName,
      contactMobile: r.contactMobile,
      extraFields: r.extraFields as ExtraValues,
    }),
    [r],
  );
  const [f, setF] = React.useState(initial);
  React.useEffect(() => {
    if (open) {
      setF(initial);
      setError(null);
    }
  }, [open, initial]);

  const cfg = lookups.data;
  if (!cfg) return null;
  const fields = cfg.formFields.filter((x) => x.issueTypeId === null || x.issueTypeId === Number(f.issueTypeId));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {};
    if (f.locationId !== initial.locationId) body.locationId = f.locationId;
    if (!f.locationId && f.zoneId !== initial.zoneId) body.zoneId = Number(f.zoneId);
    if (f.issueTypeId !== initial.issueTypeId) body.issueTypeId = Number(f.issueTypeId);
    if (f.priorityId !== initial.priorityId) body.priorityId = Number(f.priorityId);
    if (f.membersNeeded !== initial.membersNeeded) body.membersNeeded = Number(f.membersNeeded);
    for (const k of ["description", "landmark", "callerName", "callerMobile", "contactName", "contactMobile"] as const) if (f[k] !== initial[k]) body[k] = f[k];
    if (JSON.stringify(f.extraFields) !== JSON.stringify(initial.extraFields) || body.issueTypeId) body.extraFields = f.extraFields;
    if (!Object.keys(body).length) return setOpen(false);
    setBusy(true);
    try {
      await patch(`/requests/${r.id}`, body);
      toast.success(t("common.saved"));
      ["request", "board"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil /> {t("req.editDetails")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={save} className="grid gap-3">
            <DialogHeader>
              <DialogTitle>
                {r.code} · {t("req.editDetails")}
              </DialogTitle>
            </DialogHeader>
            <Field label={t("intake.location")}>
              <LocationPicker locations={cfg.locations} zones={cfg.zones} value={f.locationId} onChange={(id) => setF({ ...f, locationId: id })} />
            </Field>
            {!f.locationId && (
              <Field label={t("intake.zone")}>
                <Select value={f.zoneId} onChange={(e) => setF({ ...f, zoneId: e.target.value })}>
                  {cfg.zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.code} · {label(z)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("intake.issueType")}>
                <Select value={f.issueTypeId} onChange={(e) => setF({ ...f, issueTypeId: e.target.value, extraFields: {} })}>
                  {cfg.issueTypes.map((i) => (
                    <option key={i.id} value={i.id}>
                      {label(i)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("intake.urgency")}>
                <Select value={f.priorityId} onChange={(e) => setF({ ...f, priorityId: e.target.value })}>
                  {cfg.priorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      {label(p)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("intake.howMany")}>
                <Input type="number" min={1} value={f.membersNeeded} onChange={(e) => setF({ ...f, membersNeeded: e.target.value })} />
              </Field>
            </div>
            <Field label={t("intake.description")}>
              <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </Field>
            <Field label={t("intake.landmark")}>
              <Input value={f.landmark} onChange={(e) => setF({ ...f, landmark: e.target.value })} />
            </Field>
            <ExtraFields fields={fields} values={f.extraFields} onChange={(v) => setF({ ...f, extraFields: v })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("intake.callerName")}>
                <Input value={f.callerName} onChange={(e) => setF({ ...f, callerName: e.target.value })} />
              </Field>
              <Field label={t("intake.callerMobile")}>
                <Input value={f.callerMobile} onChange={(e) => setF({ ...f, callerMobile: e.target.value })} />
              </Field>
              <Field label={t("intake.contactName")}>
                <Input value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} />
              </Field>
              <Field label={t("intake.contactMobile")}>
                <Input value={f.contactMobile} onChange={(e) => setF({ ...f, contactMobile: e.target.value })} />
              </Field>
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
