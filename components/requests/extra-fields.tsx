"use client";

import { Checkbox, Field, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import type { FormField } from "@/lib/types";

export type ExtraValues = Record<string, string | number | boolean>;

/** Extra questions configured for the chosen issue type (FR-M5-05). */
export function ExtraFields({ fields, values, onChange }: { fields: FormField[]; values: ExtraValues; onChange: (v: ExtraValues) => void }) {
  const { label } = useI18n();
  if (!fields.length) return null;
  const set = (code: string, v: string | number | boolean) => onChange({ ...values, [code]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `extra-${f.code}`;
        const v = values[f.code];
        if (f.fieldType === "BOOLEAN") {
          return <Checkbox key={f.id} id={id} checked={!!v} onChange={(e) => set(f.code, e.target.checked)} label={label(f)} />;
        }
        return (
          <Field key={f.id} label={label(f)} htmlFor={id} required={f.required}>
            {f.fieldType === "CHOICE" ? (
              <Select id={id} value={String(v ?? "")} onChange={(e) => set(f.code, e.target.value)} required={f.required}>
                <option value="">—</option>
                {f.options
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
                  .map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
              </Select>
            ) : (
              <Input
                id={id}
                type={f.fieldType === "NUMBER" ? "number" : "text"}
                inputMode={f.fieldType === "NUMBER" ? "numeric" : undefined}
                min={f.fieldType === "NUMBER" ? 0 : undefined}
                value={String(v ?? "")}
                onChange={(e) => set(f.code, f.fieldType === "NUMBER" && e.target.value !== "" ? Number(e.target.value) : e.target.value)}
                required={f.required}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}
