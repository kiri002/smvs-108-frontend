"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState, Loading, PageHeader } from "@/components/common/states";
import { Select } from "@/components/ui/form";
import { errorMessage, get, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Matrix = {
  modules: { code: string; label: string }[];
  actions: string[];
  scopes: string[];
  roles: { id: number; code: string; labelEn: string; active: boolean }[];
  grants: { roleId: number; module: string; action: string; scope: string }[];
};

const SCOPE_STYLE: Record<string, string> = {
  ALL: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  ZONE: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  TEAM: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100",
  OWN: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
};

/** FR-M3-04: role × module × action with data scope. Changes apply at the next request. */
export default function PermissionsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["permissions"], queryFn: () => get<Matrix>("/permissions") });
  const [module, setModule] = React.useState("");
  const canEdit = !!can("CONFIG", "CONFIGURE");

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const m = q.data;
  const roles = m.roles.filter((r) => r.active);
  const grant = (roleId: number, mod: string, action: string) => m.grants.find((g) => g.roleId === roleId && g.module === mod && g.action === action)?.scope ?? "";

  const set = async (roleId: number, mod: string, action: string, scope: string) => {
    try {
      const next = await put<Matrix>("/permissions", { roleId, module: mod, action, scope: scope || null });
      qc.setQueryData(["permissions"], next);
      toast.success("Permission updated");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const modules = m.modules.filter((x) => !module || x.code === module);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Permission matrix"
        description="Scope: ALL = everything, ZONE = own zone, TEAM = own team, OWN = own records. CONFIGURE grants every action in the module."
        actions={
          <Select className="w-auto" value={module} onChange={(e) => setModule(e.target.value)} aria-label="Module">
            <option value="">All modules</option>
            {m.modules.map((x) => (
              <option key={x.code} value={x.code}>
                {x.label}
              </option>
            ))}
          </Select>
        }
      />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="p-2 text-left">Module · action</th>
              {roles.map((r) => (
                <th key={r.id} className="p-2 text-left whitespace-nowrap">
                  {r.labelEn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((mod) => (
              <React.Fragment key={mod.code}>
                <tr className="bg-muted/30 border-t">
                  <td colSpan={roles.length + 1} className="p-2 font-semibold">
                    {mod.label}
                  </td>
                </tr>
                {m.actions.map((action) => (
                  <tr key={action} className="border-t">
                    <td className="text-muted-foreground p-1.5 pl-4 font-mono">{action}</td>
                    {roles.map((r) => {
                      const v = grant(r.id, mod.code, action);
                      return (
                        <td key={r.id} className="p-1">
                          {canEdit ? (
                            <select
                              aria-label={`${r.labelEn} ${mod.code} ${action}`}
                              className={cn("h-7 w-20 rounded border px-1 text-xs", v && SCOPE_STYLE[v])}
                              value={v}
                              onChange={(e) => void set(r.id, mod.code, action, e.target.value)}
                            >
                              <option value="">—</option>
                              {m.scopes.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={cn("rounded px-1.5 py-0.5", v && SCOPE_STYLE[v])}>{v || "—"}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
