"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, Pencil, Plus, Power, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Empty, ErrorState, Loading, PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api, errorMessage, get, patch, post } from "@/lib/api";
import { useAdminEvent, useConfigMeta, useConfigRows, type EntityDef, type FieldDef, type Row } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { downloadText, parseCsv } from "@/lib/csv";

type Options = Record<string, { value: number; label: string }[]>;

function useRefOptions(def: EntityDef | undefined, metas: EntityDef[], eventId: number | undefined): Options {
  const refFields = (def?.fields ?? []).filter((f) => f.type === "ref" && f.ref);
  const results = useQueries({
    queries: refFields.map((f) => ({
      queryKey: f.ref === "users" ? ["users", "all"] : ["config", f.ref, eventId, true],
      queryFn: () => (f.ref === "users" ? get<Row[]>("/users") : get<Row[]>(`/config/${f.ref}`, { includeInactive: 1 })),
      enabled: eventId !== undefined,
      staleTime: 30_000,
    })),
  });
  const out: Options = {};
  refFields.forEach((f, i) => {
    const target = metas.find((m) => m.key === f.ref);
    const rows = results[i]?.data ?? [];
    out[f.name] = rows.map((r) => {
      const name = f.ref === "users" ? `${r.name} · ${r.mobile}` : target?.display === "labelEn" || target?.display === "name" ? `${r.code ? `${r.code} · ` : ""}${r[target.display]}` : String(r.code ?? r[target?.display ?? "id"]);
      return { value: r.id, label: `${name}${r.active === false ? " (inactive)" : ""}` };
    });
  });
  return out;
}

function show(f: FieldDef, v: unknown, opts: Options) {
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
  if (f.type === "ref") return opts[f.name]?.find((o) => o.value === v)?.label ?? `#${v}`;
  if (f.type === "bool") return v ? "Yes" : "No";
  if (f.type === "color")
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3.5 rounded border" style={{ backgroundColor: String(v) }} />
        <span className="font-mono text-xs">{String(v)}</span>
      </span>
    );
  return String(v);
}

function FieldInput({ f, value, onChange, opts, disabled }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; opts: Options; disabled?: boolean }) {
  const id = `f-${f.name}`;
  switch (f.type) {
    case "bool":
      return <Checkbox id={id} checked={!!value} onChange={(e) => onChange(e.target.checked)} label={f.label} disabled={disabled} />;
    case "enum":
      return (
        <Select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
          <option value="">—</option>
          {f.enumValues?.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      );
    case "ref":
      return (
        <Select id={id} value={value === null || value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} disabled={disabled}>
          <option value="">—</option>
          {opts[f.name]?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    case "longtext":
      return <Textarea id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={disabled} />;
    case "color":
      return (
        <div className="flex gap-2">
          <input type="color" aria-label={f.label} value={String(value || "#64748b")} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border" disabled={disabled} />
          <Input id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="font-mono" />
        </div>
      );
    default:
      return (
        <Input
          id={id}
          type={f.type === "int" || f.type === "float" ? "number" : f.type === "time" ? "time" : "text"}
          step={f.type === "float" ? "any" : undefined}
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
  }
}

function EditDialog({ def, row, open, onOpenChange, opts, onSaved }: { def: EntityDef; row: Row | null; open: boolean; onOpenChange: (o: boolean) => void; opts: Options; onSaved: () => void }) {
  const [values, setValues] = React.useState<Record<string, unknown>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (row) setValues({ ...row });
    else setValues(Object.fromEntries(def.fields.map((f) => [f.name, f.default ?? (f.type === "bool" ? false : "")])));
  }, [open, row, def]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      for (const f of def.fields) if (!(row && f.immutable)) body[f.name] = values[f.name];
      if (def.hasSort) body.sortOrder = values.sortOrder ?? "";
      if (row) await patch(`/config/${def.key}/${row.id}`, body);
      else await post(`/config/${def.key}`, body);
      toast.success("Saved");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={save} className="grid gap-3">
          <DialogHeader>
            <DialogTitle>
              {row ? "Edit" : "Add"} · {def.label}
            </DialogTitle>
            <DialogDescription>{def.description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {def.fields.map((f) => (
              <Field key={f.name} label={f.type === "bool" ? undefined : f.label} htmlFor={`f-${f.name}`} required={f.required} hint={f.help ?? (row && f.immutable ? "Cannot change after creation" : undefined)} className={f.type === "longtext" ? "sm:col-span-2" : undefined}>
                <FieldInput f={f} value={values[f.name]} onChange={(v) => setValues({ ...values, [f.name]: v })} opts={opts} disabled={!!row && f.immutable} />
              </Field>
            ))}
            {def.hasSort && (
              <Field label="Sort order" htmlFor="f-sortOrder">
                <Input id="f-sortOrder" type="number" value={values.sortOrder === undefined || values.sortOrder === null ? "" : String(values.sortOrder)} onChange={(e) => setValues({ ...values, sortOrder: e.target.value })} />
              </Field>
            )}
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EntityPage() {
  const { entity } = useParams<{ entity: string }>();
  const { can } = useAuth();
  const qc = useQueryClient();
  const meta = useConfigMeta();
  const { current } = useAdminEvent();
  const def = meta.data?.find((m) => m.key === entity);
  const [inactive, setInactive] = React.useState(false);
  const rows = useConfigRows(entity, current?.id, inactive);
  const opts = useRefOptions(def, meta.data ?? [], current?.id);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [open, setOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const canEdit = !!can("CONFIG", "CONFIGURE");

  const refresh = () => ["config", "lookups", "setup", "teamBoard"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));

  if (meta.isLoading) return <Loading />;
  if (!def) return <ErrorState error={new Error("Unknown configuration list.")} />;
  const columns = def.fields.filter((f) => f.list);

  const toggle = async (r: Row) => {
    try {
      await post(`/config/${def.key}/${r.id}/${r.active === false ? "activate" : "deactivate"}`);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get(`/config/${def.key}/export`, { responseType: "text" });
      downloadText(`${def.key}.csv`, res.data as string);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseCsv(await file.text());
      const res = await post<{ created: number; updated: number; errors: { row: number; message: string }[] }>(`/config/${def.key}/import`, { rows: parsed });
      toast.success(`Imported: ${res.created} added, ${res.updated} updated`);
      res.errors.slice(0, 5).forEach((e) => toast.error(`Row ${e.row}: ${e.message}`));
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const canAdd = canEdit && !(def.singleton && (rows.data?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link href="/admin/config">
            <ArrowLeft />
          </Link>
        </Button>
        <PageHeader
          title={def.label}
          description={def.description}
          actions={
            <>
              {canAdd && (
                <Button
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                  }}
                  data-testid="config-add"
                >
                  <Plus /> Add
                </Button>
              )}
              <Button variant="outline" onClick={exportCsv}>
                <Download /> Export CSV
              </Button>
              {canEdit && (
                <>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void importCsv(e.target.files?.[0])} />
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload /> Import CSV
                  </Button>
                </>
              )}
            </>
          }
        />
      </div>
      {def.hasActive && <Checkbox checked={inactive} onChange={(e) => setInactive(e.target.checked)} label="Show inactive" />}
      {rows.isLoading ? (
        <Loading />
      ) : rows.error ? (
        <ErrorState error={rows.error} onRetry={() => rows.refetch()} />
      ) : !rows.data?.length ? (
        <Empty>Nothing here yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                {columns.map((c) => (
                  <th key={c.name} className="p-2 font-medium whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                {def.hasActive && <th className="p-2 font-medium">Status</th>}
                {canEdit && <th className="p-2" />}
              </tr>
            </thead>
            <tbody>
              {rows.data.map((r) => (
                <tr key={r.id} className={`border-t ${r.active === false ? "opacity-50" : ""}`}>
                  {columns.map((c) => (
                    <td key={c.name} className="max-w-xs p-2 break-words">
                      {show(c, r[c.name], opts)}
                    </td>
                  ))}
                  {def.hasActive && <td className="p-2">{r.active === false ? <Badge variant="secondary">Inactive</Badge> : <Badge variant="success">Active</Badge>}</td>}
                  {canEdit && (
                    <td className="p-2 whitespace-nowrap">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Edit"
                        onClick={() => {
                          setEditing(r);
                          setOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      {def.hasActive && (
                        <Button size="icon-sm" variant="ghost" aria-label={r.active === false ? "Activate" : "Deactivate"} onClick={() => void toggle(r)}>
                          <Power className={r.active === false ? "text-emerald-600" : "text-destructive"} />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <EditDialog def={def} row={editing} open={open} onOpenChange={setOpen} opts={opts} onSaved={refresh} />
    </div>
  );
}
