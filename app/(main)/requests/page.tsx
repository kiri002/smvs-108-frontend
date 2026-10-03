"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";

import { Empty, ErrorState, Loading, PageHeader } from "@/components/common/states";
import { RequestTags } from "@/components/requests/request-card";
import { ColorBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { get } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLookups } from "@/lib/queries";
import { formatDateTime, minutesBetween } from "@/lib/time";
import type { BoardRequest } from "@/lib/types";

type Page = { total: number; page: number; pageSize: number; items: BoardRequest[] };

export default function RequestsPage() {
  const { t, label } = useI18n();
  const lookups = useLookups();
  const [filters, setFilters] = React.useState({ status: "all", zoneId: "", issueTypeId: "", drill: "include", q: "" });
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setFilters((f) => ({ ...f, q: search }));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const q = useQuery({
    queryKey: ["requests", filters, page],
    queryFn: () => get<Page>("/requests", { ...filters, zoneId: filters.zoneId || undefined, issueTypeId: filters.issueTypeId || undefined, q: filters.q || undefined, page, pageSize: 50 }),
  });
  const set = (k: keyof typeof filters, v: string) => {
    setFilters({ ...filters, [k]: v });
    setPage(1);
  };
  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("nav.requests")} description={q.data ? `${q.data.total}` : undefined} />
      <div className="flex flex-wrap gap-2">
        <Input className="w-56" placeholder={`${t("common.search")}: 108-0001, name…`} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("common.search")} />
        <Select className="w-auto" value={filters.status} onChange={(e) => set("status", e.target.value)} aria-label="Status">
          <option value="all">{t("common.all")}</option>
          <option value="open">Open / active</option>
          <option value="closed">Closed / cancelled</option>
        </Select>
        <Select className="w-auto" value={filters.zoneId} onChange={(e) => set("zoneId", e.target.value)} aria-label={t("intake.zone")}>
          <option value="">{t("intake.zone")}: {t("common.all")}</option>
          {lookups.data?.zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.code} · {label(z)}
            </option>
          ))}
        </Select>
        <Select className="w-auto" value={filters.issueTypeId} onChange={(e) => set("issueTypeId", e.target.value)} aria-label={t("intake.issueType")}>
          <option value="">{t("intake.issueType")}: {t("common.all")}</option>
          {lookups.data?.issueTypes.map((i) => (
            <option key={i.id} value={i.id}>
              {label(i)}
            </option>
          ))}
        </Select>
        <Select className="w-auto" value={filters.drill} onChange={(e) => set("drill", e.target.value)} aria-label={t("common.drill")}>
          <option value="include">Drills included</option>
          <option value="exclude">Live only</option>
          <option value="only">Drills only</option>
        </Select>
      </div>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.items.length ? (
        <Empty>{t("common.noData")}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">{t("req.what")}</th>
                <th className="p-2">{t("req.where")}</th>
                <th className="p-2">Status</th>
                <th className="p-2">Teams</th>
                <th className="p-2">Call</th>
                <th className="p-2 text-right">Arrive (min)</th>
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((r) => {
                const arrive = r.arrivedAt ? minutesBetween(r.requestedAt, r.arrivedAt) : null;
                return (
                  <tr key={r.id} className="hover:bg-accent/40 border-t">
                    <td className="p-2 font-mono font-semibold">
                      <Link href={`/requests/${r.id}`} className="underline-offset-2 hover:underline">
                        {r.code}
                      </Link>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="size-2 rounded-full" style={{ backgroundColor: r.priority.color }} />
                        {label(r.issueType)}
                        <RequestTags r={r} />
                      </div>
                    </td>
                    <td className="p-2">
                      {r.location ? label(r.location) : label(r.zone)} <span className="text-muted-foreground">{r.zone.code}</span>
                    </td>
                    <td className="p-2">
                      <ColorBadge color={r.status.color}>{label(r.status)}</ColorBadge>
                    </td>
                    <td className="p-2 font-mono text-xs">{r.assignments.map((a) => a.team.code).join(", ") || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{formatDateTime(r.requestedAt)}</td>
                    <td className={`p-2 text-right font-mono ${arrive !== null && arrive > r.priority.arriveTargetMin ? "text-red-700" : ""}`}>{arrive === null ? "—" : arrive.toFixed(1)}</td>
                  </tr>
                );
              })}
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
