"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export type ActionField =
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; required?: boolean }
  | { name: string; label: string; type: "textarea" | "text" | "number"; required?: boolean };

/** A small confirm dialog that collects the fields an action needs (reason, note, …). */
export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  confirmLabel,
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  fields: ActionField[];
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (values: Record<string, string>) => Promise<void>;
}) {
  const { t } = useI18n();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setValues({});
      setError(null);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !values[f.name]);
    if (missing) return setError(`${missing.label} — ${t("common.required")}`);
    setBusy(true);
    setError(null);
    try {
      await onConfirm(values);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {fields.map((f) => (
            <Field key={f.name} label={f.label} htmlFor={`ad-${f.name}`} required={f.required}>
              {f.type === "select" ? (
                <Select id={`ad-${f.name}`} value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>
                  <option value="">—</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : f.type === "textarea" ? (
                <Textarea id={`ad-${f.name}`} value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
              ) : (
                <Input
                  id={`ad-${f.name}`}
                  type={f.type}
                  inputMode={f.type === "number" ? "numeric" : undefined}
                  min={f.type === "number" ? 0 : undefined}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                />
              )}
            </Field>
          ))}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
