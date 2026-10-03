"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { Empty, ErrorState, Loading, PageHeader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { get } from "@/lib/api";
import { useConfigMeta } from "@/lib/admin";
import { formatDateTime } from "@/lib/time";

type AuditPage = { total: number; page: number; pageSize: number; items: { id: number; entity: string; entityId: number; action: string; field: string; oldValue: string; newValue: string; by: string; at: string }[] };

/** Spec rule 8: every configuration change with who, when, old and new value. */
export default function AuditPage() {
  const meta = useConfigMeta();
  const [entity, setEntity] = React.useState("");
  const [page, setPage] = React.useState(1);
  const q = useQuery({ queryKey: ["audit", entity, page], queryFn: () => get<AuditPage>("/audit", { entity: entity || undefined, page, pageSize: 50 }) });
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Change history"
        description="Configuration, user and permission changes. Request changes are on each request's timeline."
        actions={
          <Select
            className="w-auto"
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
            aria-label="List"
          >
            <option value="">All lists</option>
            {["users", "permissions", "events", "app-settings"].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
            {meta.data?.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </Select>
        }
      />
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.items.length ? (
        <Empty>No changes yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Who</th>
                <th className="p-2">List</th>
                <th className="p-2">Action</th>
                <th className="p-2">Field</th>
                <th className="p-2">Old</th>
                <th className="p-2">New</th>
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((a) => (
                <tr key={a.id} className="border-t align-top">
                  <td className="p-2 whitespace-nowrap">{formatDateTime(a.at)}</td>
                  <td className="p-2">{a.by || "—"}</td>
                  <td className="p-2 font-mono text-xs">
                    {a.entity} #{a.entityId}
                  </td>
                  <td className="p-2">{a.action}</td>
                  <td className="p-2 font-mono text-xs">{a.field}</td>
                  <td className="text-muted-foreground max-w-xs truncate p-2" title={a.oldValue}>
                    {a.oldValue}
                  </td>
                  <td className="max-w-xs truncate p-2" title={a.newValue}>
                    {a.newValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ←
          </Button>
          <span className="text-sm">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            →
          </Button>
        </div>
      )}
    </div>
  );
}
