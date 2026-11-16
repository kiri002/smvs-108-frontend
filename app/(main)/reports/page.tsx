"use client";

import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, FileType2, Loader2 } from "lucide-react";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { Empty, ErrorState, Loading, PageHeader } from "@/components/common/states";
import { ColorBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { errorMessage, get } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLookups } from "@/lib/queries";
import { downloadCsv, downloadExcel, downloadPdf, num, pct, reportTables, zoned, type FilterText, type Report } from "@/lib/reports";
import { cn } from "@/lib/utils";

type Filters = { from: string; to: string; zoneId: string; teamId: string; priorityId: string; issueTypeId: string; includeDrill: boolean };
const EMPTY: Filters = { from: "", to: "", zoneId: "", teamId: "", priorityId: "", issueTypeId: "", includeDrill: false };

/** Today's date (YYYY-MM-DD) in the event's time zone. */
const todayIn = (tz: string, offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

const AXIS = { stroke: "var(--viz-axis)", fontSize: 11, tickLine: false, axisLine: { stroke: "var(--viz-grid)" } } as const;
const TOOLTIP = {
  cursor: { fill: "var(--viz-grid)", opacity: 0.5 },
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" },
  labelStyle: { fontWeight: 600 },
} as const;

function Tile({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="bg-card flex flex-col gap-1 rounded-xl border p-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className={cn("text-xs", tone === "bad" ? "text-red-700 dark:text-red-400" : tone === "good" ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>{sub}</span>}
    </div>
  );
}

/** A simple table from the shared export tables, so screen and downloads always match. */
function DataTable({ head, rows, max }: { head: string[]; rows: (string | number)[][]; max?: number }) {
  const shown = max ? rows.slice(0, max) : rows;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            {head.map((h, i) => (
              <th key={h} className={cn("p-2 font-medium whitespace-nowrap", i > 0 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, ri) => (
            <tr key={ri} className="border-b last:border-0">
              {row.map((v, i) => (
                <td key={i} className={cn("p-2 whitespace-nowrap", i > 0 && "text-right tabular-nums")}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Chart with a Chart / Table switch (the table is the accessible view of the same numbers). */
function ChartCard({ title, table, children, className }: { title: string; table: { head: string[]; rows: (string | number)[][] }; children: React.ReactNode; className?: string }) {
  const { t } = useI18n();
  const [view, setView] = React.useState<"chart" | "table">("chart");
  return (
    <Card className={cn("gap-2 py-4", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex rounded-md border p-0.5 text-xs">
          {(["chart", "table"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cn("rounded px-2 py-0.5", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {t(v === "chart" ? "rep.chart" : "rep.table")}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-4">{view === "chart" ? <div className="h-64">{children}</div> : <DataTable {...table} />}</CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { t, label } = useI18n();
  const { can } = useAuth();
  const lookups = useLookups();
  const [filters, setFilters] = React.useState<Filters>(EMPTY);
  const [busy, setBusy] = React.useState<"" | "pdf" | "xlsx" | "csv">("");
  const [search, setSearch] = React.useState("");
  const [rowsShown, setRowsShown] = React.useState(50);
  const allScope = can("REPORTS", "VIEW") === "ALL";
  const canExport = !!can("REPORTS", "EXPORT");
  const tz = lookups.data?.event?.timezone ?? "Asia/Kolkata";

  const report = useQuery({
    queryKey: ["report", filters],
    queryFn: () =>
      get<Report>("/reports", {
        from: filters.from || undefined,
        to: filters.to || undefined,
        zoneId: filters.zoneId || undefined,
        teamId: filters.teamId || undefined,
        priorityId: filters.priorityId || undefined,
        issueTypeId: filters.issueTypeId || undefined,
        includeDrill: filters.includeDrill ? 1 : undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const set = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setRowsShown(50);
  };
  const quick = [
    { key: "rep.today", from: todayIn(tz), to: todayIn(tz) },
    { key: "rep.yesterday", from: todayIn(tz, -1), to: todayIn(tz, -1) },
    { key: "rep.last7", from: todayIn(tz, -6), to: todayIn(tz) },
    { key: "rep.allDates", from: "", to: "" },
  ] as const;

  const cfg = lookups.data;
  const r = report.data;
  const tables = React.useMemo(() => (r ? Object.fromEntries(reportTables(r).map((x) => [x.name, x])) : {}), [r]);

  const filterText = (): FilterText => {
    const name = <T extends { id: number }>(list: T[] | undefined, id: string, f: (x: T) => string) => list?.find((x) => String(x.id) === id) && f(list.find((x) => String(x.id) === id)!);
    return [
      { label: "Dates", value: filters.from || filters.to ? `${filters.from || "start"} to ${filters.to || "today"}` : "All dates" },
      { label: "Zone", value: name(cfg?.zones, filters.zoneId, (z) => `${z.code} · ${z.labelEn}`) || "All" },
      { label: "Team", value: r?.filters.teamCode ?? (name(cfg?.teams, filters.teamId, (x) => x.code) || "All") },
      { label: "Priority", value: name(cfg?.priorities, filters.priorityId, (x) => x.labelEn) || "All" },
      { label: "Issue type", value: name(cfg?.issueTypes, filters.issueTypeId, (x) => x.labelEn) || "All" },
      { label: "Drills", value: filters.includeDrill ? "Included" : "Left out" },
    ];
  };

  const download = async (kind: "pdf" | "xlsx" | "csv") => {
    if (!r) return;
    setBusy(kind);
    try {
      if (kind === "csv") downloadCsv(r);
      else if (kind === "xlsx") await downloadExcel(r, filterText());
      else await downloadPdf(r, filterText());
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = r?.rows ?? [];
    if (!q) return rows;
    return rows.filter((x) => [x.code, x.location, x.issueType.labelEn, x.teams, x.caller, x.status.labelEn, x.zone.code].join(" ").toLowerCase().includes(q));
  }, [r, search]);

  const s = r?.summary;
  const dayData = r?.byDay.map((d) => ({ name: d.date.slice(5), completed: d.completed, active: d.open + d.inProgress, cancelled: d.cancelled + d.merged })) ?? [];
  const hourData = r?.byHour.map((h) => ({ name: String(h.hour).padStart(2, "0"), total: h.total })) ?? [];
  const zoneData = r?.byZone.map((z) => ({ name: z.label.split(" · ")[0], full: z.label, total: z.total })) ?? [];
  const prioData = r?.byPriority.map((p) => ({ name: p.label, dispatch: p.avgDispatchMin, arrive: p.avgArriveMin, resolve: p.avgResolveMin })) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("rep.title")}
        description={r?.filters.teamCode && !allScope ? t("rep.teamOnly", { team: r.filters.teamCode }) : t("rep.subtitle")}
        actions={
          canExport &&
          r && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void download("pdf")} disabled={!!busy} data-testid="export-pdf">
                {busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />} PDF
              </Button>
              <Button variant="outline" onClick={() => void download("xlsx")} disabled={!!busy} data-testid="export-xlsx">
                {busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Excel
              </Button>
              <Button variant="outline" onClick={() => void download("csv")} disabled={!!busy} data-testid="export-csv">
                {busy === "csv" ? <Loader2 className="animate-spin" /> : <FileType2 />} CSV
              </Button>
            </div>
          )
        }
      />

      {/* FILTERS — one row above the charts */}
      <Card className="gap-3 py-3">
        <CardContent className="grid gap-3 px-4">
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => (
              <Button key={q.key} size="sm" variant={filters.from === q.from && filters.to === q.to ? "default" : "outline"} onClick={() => set({ from: q.from, to: q.to })}>
                {t(q.key)}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Field label={t("rep.from")} htmlFor="rep-from">
              <Input id="rep-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} />
            </Field>
            <Field label={t("rep.to")} htmlFor="rep-to">
              <Input id="rep-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} />
            </Field>
            {allScope && (
              <>
                <Field label={t("intake.zone")} htmlFor="rep-zone">
                  <Select id="rep-zone" value={filters.zoneId} onChange={(e) => set({ zoneId: e.target.value })}>
                    <option value="">{t("rep.all")}</option>
                    {cfg?.zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.code} · {label(z)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("rep.team")} htmlFor="rep-team">
                  <Select id="rep-team" value={filters.teamId} onChange={(e) => set({ teamId: e.target.value })}>
                    <option value="">{t("rep.all")}</option>
                    {cfg?.teams.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.code}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}
            <Field label={t("rep.priority")} htmlFor="rep-prio">
              <Select id="rep-prio" value={filters.priorityId} onChange={(e) => set({ priorityId: e.target.value })}>
                <option value="">{t("rep.all")}</option>
                {cfg?.priorities.map((p) => (
                  <option key={p.id} value={p.id}>
                    {label(p)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("intake.issueType")} htmlFor="rep-issue">
              <Select id="rep-issue" value={filters.issueTypeId} onChange={(e) => set({ issueTypeId: e.target.value })}>
                <option value="">{t("rep.all")}</option>
                {cfg?.issueTypes.map((x) => (
                  <option key={x.id} value={x.id}>
                    {label(x)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Checkbox checked={filters.includeDrill} onChange={(e) => set({ includeDrill: e.target.checked })} label={t("rep.includeDrills")} />
            {JSON.stringify(filters) !== JSON.stringify(EMPTY) && (
              <Button size="sm" variant="ghost" onClick={() => set(EMPTY)}>
                {t("rep.reset")}
              </Button>
            )}
            {r && <span className="text-muted-foreground ml-auto text-xs">{t("rep.generated", { time: zoned(r.generatedAt, r.event.timezone) })}</span>}
          </div>
        </CardContent>
      </Card>

      {report.isLoading ? (
        <Loading />
      ) : report.error ? (
        <ErrorState error={report.error} onRetry={() => report.refetch()} />
      ) : !r || !s ? null : s.total === 0 ? (
        <Empty>{t("rep.none")}</Empty>
      ) : (
        <div className={cn("flex flex-col gap-4 transition-opacity", report.isFetching && "opacity-60")}>
          {/* HEADLINE NUMBERS */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            <Tile label={t("rep.total")} value={s.total} />
            <Tile label={t("rep.completed")} value={s.completed} sub={t("rep.ofTotal", { pct: pct(s.completionPct) })} />
            <Tile label={t("rep.active")} value={s.open + s.inProgress} sub={t("rep.openSplit", { open: s.open, prog: s.inProgress })} />
            <Tile label={t("rep.cancelled")} value={s.cancelled + s.merged} />
            <Tile label={t("rep.avgArrive")} value={`${num(s.arrive.avg)} ${t("rep.min")}`} sub={`P90 ${num(s.arrive.p90)} ${t("rep.min")}`} />
            <Tile label={t("rep.avgResolve")} value={`${num(s.resolve.avg)} ${t("rep.min")}`} sub={`P90 ${num(s.resolve.p90)} ${t("rep.min")}`} />
            <Tile
              label={t("rep.arriveTarget")}
              value={pct(s.arriveMetPct)}
              sub={s.arriveMetPct === null ? undefined : s.arriveMetPct >= 90 ? t("rep.good") : t("rep.needsWork")}
              tone={s.arriveMetPct === null ? undefined : s.arriveMetPct >= 90 ? "good" : "bad"}
            />
            <Tile
              label={t("rep.resolveTarget")}
              value={pct(s.resolveMetPct)}
              sub={s.resolveMetPct === null ? undefined : s.resolveMetPct >= 90 ? t("rep.good") : t("rep.needsWork")}
              tone={s.resolveMetPct === null ? undefined : s.resolveMetPct >= 90 ? "good" : "bad"}
            />
          </div>

          {/* CHARTS */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title={t("rep.perDay")} table={tables["By day"]}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                  <XAxis dataKey="name" {...AXIS} />
                  <YAxis allowDecimals={false} {...AXIS} />
                  <Tooltip {...TOOLTIP} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="completed" name={t("rep.completed")} stackId="a" fill="var(--viz-1)" stroke="var(--card)" strokeWidth={2} maxBarSize={28} />
                  <Bar dataKey="active" name={t("rep.active")} stackId="a" fill="var(--viz-2)" stroke="var(--card)" strokeWidth={2} maxBarSize={28} />
                  <Bar dataKey="cancelled" name={t("rep.cancelled")} stackId="a" fill="var(--viz-3)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("rep.perHour")} table={tables["By hour"]}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                  <XAxis dataKey="name" {...AXIS} interval={1} />
                  <YAxis allowDecimals={false} {...AXIS} />
                  <Tooltip {...TOOLTIP} labelFormatter={(h) => `${h}:00`} />
                  <Bar dataKey="total" name={t("rep.total")} fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("rep.byZone")} table={tables["By zone"]}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
                  <XAxis type="number" allowDecimals={false} {...AXIS} />
                  <YAxis type="category" dataKey="name" width={44} {...AXIS} />
                  <Tooltip {...TOOLTIP} labelFormatter={(_, p) => (p?.[0]?.payload as { full?: string })?.full ?? ""} />
                  <Bar dataKey="total" name={t("rep.total")} fill="var(--viz-1)" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t("rep.timeByPriority")} table={tables["By priority"]}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prioData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                  <XAxis dataKey="name" {...AXIS} />
                  <YAxis {...AXIS} unit="m" />
                  <Tooltip {...TOOLTIP} formatter={(v) => `${num(v as number)} ${t("rep.min")}`} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="dispatch" name={t("rep.sent")} fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="arrive" name={t("rep.arrived")} fill="var(--viz-2)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="resolve" name={t("rep.resolved")} fill="var(--viz-3)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* TABLES */}
          {(["Timing", "By team", "By zone", "By issue type", "By priority", "By status"] as const).map((name) =>
            tables[name] && tables[name].rows.length ? (
              <Card key={name} className="gap-2 py-4">
                <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
                  <CardTitle className="text-base">{tables[name].title}</CardTitle>
                  {canExport && (
                    <Button size="sm" variant="ghost" onClick={() => downloadCsv(r, name)}>
                      CSV
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="px-4">
                  <DataTable head={tables[name].head} rows={tables[name].rows} />
                </CardContent>
              </Card>
            ) : null,
          )}

          {/* EVERY REQUEST */}
          <Card className="gap-2 py-4">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-4">
              <CardTitle className="text-base">
                {t("rep.allRequests")} ({filteredRows.length})
              </CardTitle>
              <Input className="w-56" placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </CardHeader>
            <CardContent className="overflow-x-auto px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="p-2">{t("rep.request")}</th>
                    <th className="p-2">{t("rep.raised")}</th>
                    <th className="p-2">{t("intake.zone")}</th>
                    <th className="p-2">{t("intake.issueType")}</th>
                    <th className="p-2">{t("rep.status")}</th>
                    <th className="p-2">{t("rep.team")}</th>
                    <th className="p-2 text-right">{t("rep.sent")}</th>
                    <th className="p-2 text-right">{t("rep.arrived")}</th>
                    <th className="p-2 text-right">{t("rep.resolved")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, rowsShown).map((x) => {
                    const cell = (v: number | null, ok: boolean | null) => (
                      <td className={cn("p-2 text-right font-mono tabular-nums", ok === false && "text-red-700 dark:text-red-400")}>
                        {num(v)}
                        {ok === false && <span className="sr-only"> (late)</span>}
                      </td>
                    );
                    return (
                      <tr key={x.id} className="border-b last:border-0">
                        <td className="p-2 font-mono">
                          <a href={`/requests/${x.id}`} className="hover:underline">
                            {x.code}
                          </a>
                          {x.isBackEntry && <span className="text-muted-foreground ml-1 text-xs">BE</span>}
                          {x.isDrill && <span className="ml-1 text-xs text-amber-700">DRILL</span>}
                        </td>
                        <td className="p-2 whitespace-nowrap">{zoned(x.requestedAt, r.event.timezone)}</td>
                        <td className="p-2">{x.zone.code}</td>
                        <td className="p-2">
                          {x.issueType.labelEn}
                          <span className="text-muted-foreground block text-xs">{x.location}</span>
                        </td>
                        <td className="p-2">
                          <ColorBadge color={x.status.color}>{x.status.labelEn}</ColorBadge>
                        </td>
                        <td className="p-2 font-mono text-xs">{x.teams || "—"}</td>
                        {cell(x.dispatchMin, x.dispatchMet)}
                        {cell(x.arriveMin, x.arriveMet)}
                        {cell(x.resolveMin, x.resolveMet)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-muted-foreground mt-2 text-xs">{t("rep.minutesNote")}</p>
              {filteredRows.length > rowsShown && (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setRowsShown((n) => n + 100)}>
                  {t("rep.showMore", { n: filteredRows.length - rowsShown })}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
