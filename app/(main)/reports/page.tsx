"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronDown, CircleHelp, FileSpreadsheet, FileText, FileType2, Lightbulb, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
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
import {
  cellText,
  downloadCsv,
  downloadExcel,
  downloadPdf,
  fmtMin,
  headline,
  heatHex,
  HEAT,
  tone,
  reportTables,
  zoned,
  type FilterText,
  type MetCount,
  type Report,
  type Table,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

type Filters = { from: string; to: string; zoneId: string; teamId: string; priorityId: string; issueTypeId: string; includeDrill: boolean };
const EMPTY: Filters = { from: "", to: "", zoneId: "", teamId: "", priorityId: "", issueTypeId: "", includeDrill: false };

/** Today's date (YYYY-MM-DD) in the event's time zone. */
const todayIn = (tz: string, offsetDays = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offsetDays * 86_400_000));

const AXIS = { stroke: "var(--viz-axis)", fontSize: 11, tickLine: false, axisLine: { stroke: "var(--viz-grid)" } } as const;
const TOOLTIP = {
  cursor: { fill: "var(--viz-grid)", opacity: 0.5 },
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" },
  labelStyle: { fontWeight: 600 },
} as const;

const TONE_CLS = { good: "text-emerald-700 dark:text-emerald-400", bad: "text-red-700 dark:text-red-400", few: "text-muted-foreground" } as const;

/** A % with the count it rests on, an icon and a word, so it never relies on colour alone. */
function Met({ m }: { m: MetCount }) {
  const { t } = useI18n();
  const k = tone(m);
  if (!k) return <span className="text-muted-foreground">—</span>;
  const Icon = k === "good" ? CheckCircle2 : k === "bad" ? XCircle : CircleHelp;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", TONE_CLS[k])} title={k === "few" ? t("rep.fewHelp") : undefined}>
      <Icon className="size-3.5" />
      <b className="tabular-nums">{m.pct}%</b>
      <span className="text-muted-foreground text-xs">
        ({m.met}/{m.of}
        {k === "few" ? ` · ${t("rep.few")}` : ""})
      </span>
    </span>
  );
}

/** A view from the shared definitions, so screen and downloads always agree. */
function DataTable({ table, tz, max, link }: { table: Table; tz: string; max?: number; link?: (row: number) => string }) {
  const rows = max ? table.rows.slice(0, max) : table.rows;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            {table.cols.map((c, i) => (
              <th key={c.h} className={cn("p-2 font-medium whitespace-nowrap", i > 0 && c.f && c.f !== "text" && c.f !== "dt" && "text-right")}>
                {c.h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b last:border-0">
              {row.map((v, i) => {
                const c = table.cols[i];
                const text = cellText(v, c.f, tz);
                return (
                  <td key={i} className={cn("p-2 whitespace-nowrap", i > 0 && c.f && c.f !== "text" && c.f !== "dt" && "text-right tabular-nums")}>
                    {i === 0 && link ? (
                      <Link href={link(ri)} className="font-mono hover:underline">
                        {text}
                      </Link>
                    ) : (
                      text
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Chart with a Chart / Table switch (the table is the accessible view of the same numbers). */
function ChartCard({ title, table, tz, children }: { title: string; table: Table; tz: string; children: React.ReactNode }) {
  const { t } = useI18n();
  const [view, setView] = React.useState<"chart" | "table">("chart");
  return (
    <Card className="gap-2 py-4">
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
      <CardContent className="px-4">{view === "chart" ? children : <DataTable table={table} tz={tz} />}</CardContent>
    </Card>
  );
}

/** Requests by day × hour; darker = busier. Shows the last 14 days. */
function BusyHours({ r }: { r: Report }) {
  const { t } = useI18n();
  const days = r.byDay.slice(-14);
  const max = Math.max(1, ...r.byDayHour.map((x) => x.total));
  const at = (date: string, h: number) => r.byDayHour.find((x) => x.date === date && x.hour === h)?.total ?? 0;
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[560px] gap-[2px] text-[10px]" style={{ gridTemplateColumns: "64px repeat(24, minmax(16px, 1fr))" }}>
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-muted-foreground text-center">
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </span>
        ))}
        {days.map((d) => (
          <React.Fragment key={d.date}>
            <span className="text-muted-foreground pr-1 text-right leading-5">{d.date.slice(5)}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const v = at(d.date, h);
              const share = v / max;
              return (
                <span
                  key={h}
                  title={`${d.date} ${String(h).padStart(2, "0")}:00 · ${v}`}
                  className="flex h-5 items-center justify-center rounded-[3px] font-medium tabular-nums"
                  style={{ background: v ? heatHex(share) : "var(--viz-grid)", color: share > 0.55 ? "#fff" : "#0b0b0b" }}
                >
                  {v || ""}
                </span>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
        {t("rep.fewer")}
        {HEAT.map((c) => (
          <span key={c} className="h-2.5 w-5 rounded-[2px]" style={{ background: c }} />
        ))}
        {t("rep.more")}
        {r.byDay.length > 14 && <span className="ml-2">{t("rep.last14")}</span>}
      </div>
    </div>
  );
}

function Section({ title, children, right }: { title: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-4">
        <CardTitle className="flex items-center gap-2 text-base">{title}</CardTitle>
        {right}
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
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
  const [allExceptions, setAllExceptions] = React.useState(false);
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
  const tables = React.useMemo(() => (r ? reportTables(r) : null), [r]);

  const filterText = (): FilterText => {
    const find = <X extends { id: number }>(list: X[] | undefined, id: string) => list?.find((x) => String(x.id) === id);
    const zone = find(cfg?.zones, filters.zoneId);
    return [
      { label: "Dates", value: filters.from || filters.to ? `${filters.from || "start"} to ${filters.to || "today"}` : "All dates" },
      { label: "Zone", value: zone ? `${zone.code} · ${zone.labelEn}` : "All" },
      { label: "Team", value: r?.filters.teamCode ?? find(cfg?.teams, filters.teamId)?.code ?? "All" },
      { label: "Priority", value: find(cfg?.priorities, filters.priorityId)?.labelEn ?? "All" },
      { label: "Issue type", value: find(cfg?.issueTypes, filters.issueTypeId)?.labelEn ?? "All" },
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
  const zoneData = r?.byZone.map((z) => ({ name: z.label.split(" · ")[0], full: z.label, total: z.total })) ?? [];
  const issueData = (r?.byIssueType ?? []).slice(0, 8).map((x) => ({ name: x.label, total: x.total }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("rep.title")}
        description={r?.filters.teamCode && !allScope ? t("rep.teamOnly", { team: r.filters.teamCode }) : t("rep.subtitle")}
        actions={
          canExport &&
          r && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void download("pdf")} disabled={!!busy} data-testid="export-pdf" title={t("rep.pdfHelp")}>
                {busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />} PDF
              </Button>
              <Button variant="outline" onClick={() => void download("xlsx")} disabled={!!busy} data-testid="export-xlsx" title={t("rep.xlsxHelp")}>
                {busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Excel
              </Button>
              <Button variant="outline" onClick={() => void download("csv")} disabled={!!busy} data-testid="export-csv" title={t("rep.csvHelp")}>
                {busy === "csv" ? <Loader2 className="animate-spin" /> : <FileType2 />} CSV
              </Button>
            </div>
          )
        }
      />

      {/* FILTERS */}
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
      ) : !r || !s || !tables ? null : s.total === 0 ? (
        <Empty>{t("rep.none")}</Empty>
      ) : (
        <div className={cn("flex flex-col gap-4 transition-opacity", report.isFetching && "opacity-60")}>
          {/* 1. FINDINGS — the answer first */}
          <Section
            title={
              <>
                <Lightbulb className="size-4 text-amber-600" /> {t("rep.findings")}
              </>
            }
          >
            <ul className="grid gap-1.5 text-sm" data-testid="rep-findings">
              {r.findings.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* 2. HEADLINE NUMBERS */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            {headline(r).map((h) => (
              <div key={h.label} className="bg-card flex flex-col gap-1 rounded-xl border p-3">
                <span className="text-muted-foreground text-xs">{h.label}</span>
                <span className={cn("text-2xl font-bold tabular-nums", h.tone && h.tone !== "few" && TONE_CLS[h.tone])}>{h.value}</span>
                {h.sub && <span className="text-muted-foreground text-xs">{h.sub}</span>}
              </div>
            ))}
          </div>

          {/* 3. ON TIME BY PRIORITY */}
          <Section title={t("rep.onTimeTitle")}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="rep-ontime">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="p-2">{t("rep.priority")}</th>
                    <th className="p-2">{t("rep.targets")}</th>
                    <th className="p-2 text-right">{t("rep.total")}</th>
                    <th className="p-2">{t("rep.sentOnTime")}</th>
                    <th className="p-2">{t("rep.arrivedOnTime")}</th>
                    <th className="p-2">{t("rep.resolvedOnTime")}</th>
                    <th className="p-2 text-right">{t("rep.typicalArrive")}</th>
                    <th className="p-2 text-right">{t("rep.slowArrive")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...r.onTime, r.onTimeAll].map((p) => (
                    <tr key={p.label} className={cn("border-b last:border-0", p.label === "All priorities" && "font-semibold")}>
                      <td className="p-2 whitespace-nowrap">{p.color ? <ColorBadge color={p.color}>{p.label}</ColorBadge> : t("rep.allPriorities")}</td>
                      <td className="text-muted-foreground p-2 text-xs whitespace-nowrap">{p.targets && p.color ? `${p.targets.dispatch} / ${p.targets.arrive} / ${p.targets.resolve} min` : ""}</td>
                      <td className="p-2 text-right tabular-nums">{p.total}</td>
                      <td className="p-2">
                        <Met m={p.dispatch} />
                      </td>
                      <td className="p-2">
                        <Met m={p.arrive} />
                      </td>
                      <td className="p-2">
                        <Met m={p.resolve} />
                      </td>
                      <td className="p-2 text-right tabular-nums">{fmtMin(p.arriveMedian)}</td>
                      <td className="p-2 text-right tabular-nums">{fmtMin(p.arriveP90)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">{t("rep.onTimeNote")}</p>
          </Section>

          {/* 4. CHARTS */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title={t("rep.perDay")} table={tables.byDay} tz={tz}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                    <XAxis dataKey="name" {...AXIS} />
                    <YAxis allowDecimals={false} {...AXIS} />
                    <Tooltip {...TOOLTIP} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="completed" name={t("rep.completed")} stackId="a" fill="var(--viz-1)" stroke="var(--card)" strokeWidth={2} maxBarSize={36} />
                    <Bar dataKey="active" name={t("rep.active")} stackId="a" fill="var(--viz-2)" stroke="var(--card)" strokeWidth={2} maxBarSize={36} />
                    <Bar dataKey="cancelled" name={t("rep.cancelled")} stackId="a" fill="var(--viz-3)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title={t("rep.busyHours")} table={tables.busy} tz={tz}>
              <BusyHours r={r} />
            </ChartCard>

            <ChartCard title={t("rep.byZone")} table={tables.byZone} tz={tz}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
                    <XAxis type="number" allowDecimals={false} {...AXIS} />
                    <YAxis type="category" dataKey="name" width={44} {...AXIS} />
                    <Tooltip {...TOOLTIP} labelFormatter={(_, p) => (p?.[0]?.payload as { full?: string })?.full ?? ""} />
                    <Bar dataKey="total" name={t("rep.total")} fill="var(--viz-1)" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title={t("rep.byIssue")} table={tables.byIssueType} tz={tz}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={issueData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
                    <XAxis type="number" allowDecimals={false} {...AXIS} />
                    <YAxis type="category" dataKey="name" width={130} {...AXIS} />
                    <Tooltip {...TOOLTIP} />
                    <Bar dataKey="total" name={t("rep.total")} fill="var(--viz-1)" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* 5. EXCEPTIONS */}
          <Section
            title={
              <>
                <AlertTriangle className="size-4 text-red-600" /> {t("rep.exceptions")} ({r.exceptions.length})
              </>
            }
            right={
              canExport && r.exceptions.length > 0 ? (
                <Button size="sm" variant="ghost" onClick={() => downloadCsv(r, tables.exceptions)}>
                  CSV
                </Button>
              ) : undefined
            }
          >
            {r.exceptions.length === 0 ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="mr-1 inline size-4" />
                {t("rep.noExceptions")}
              </p>
            ) : (
              <div data-testid="rep-exceptions">
                <DataTable table={tables.exceptions} tz={tz} max={allExceptions ? undefined : 15} link={(i) => `/requests/${r.exceptions[i].id}`} />
                {r.exceptions.length > 15 && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setAllExceptions((x) => !x)}>
                    {allExceptions ? t("rep.showFewer") : t("rep.showAll", { n: r.exceptions.length })}
                  </Button>
                )}
              </div>
            )}
          </Section>

          {/* 6. TEAMS */}
          {tables.byTeam.rows.length > 0 && (
            <Section title={t("rep.teams")}>
              <DataTable table={tables.byTeam} tz={tz} />
            </Section>
          )}

          {/* 7. DETAIL, folded away */}
          <details className="bg-card group rounded-xl border">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-base font-semibold">
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" /> {t("rep.detail")}
            </summary>
            <div className="grid gap-4 px-4 pb-4">
              {[tables.byZone, tables.byIssueType, tables.byDay].map((tb) => (
                <div key={tb.name}>
                  <h3 className="mb-1 text-sm font-semibold">{tb.title}</h3>
                  <DataTable table={tb} tz={tz} />
                </div>
              ))}
            </div>
          </details>

          {/* 8. EVERY REQUEST */}
          <Section
            title={`${t("rep.allRequests")} (${filteredRows.length})`}
            right={<Input className="w-56" placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} />}
          >
            <div className="overflow-x-auto">
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
                      <td className={cn("p-2 text-right whitespace-nowrap tabular-nums", ok === false && "font-semibold text-red-700 dark:text-red-400")}>
                        {fmtMin(v)}
                        {ok === false && <span className="sr-only"> (late)</span>}
                      </td>
                    );
                    return (
                      <tr key={x.id} className="border-b last:border-0">
                        <td className="p-2 font-mono">
                          <Link href={`/requests/${x.id}`} className="hover:underline">
                            {x.code}
                          </Link>
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
            </div>
            <p className="text-muted-foreground mt-2 text-xs">{t("rep.minutesNote")}</p>
            {filteredRows.length > rowsShown && (
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setRowsShown((n) => n + 100)}>
                {t("rep.showMore", { n: filteredRows.length - rowsShown })}
              </Button>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
