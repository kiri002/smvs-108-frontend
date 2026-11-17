// Report payload (GET /reports) and its downloads.
//
//   PDF   – a 3–4 page management report: findings, headline numbers, on-time by priority,
//           busy hours, exceptions, zones, teams, and a readable request list.
//   Excel – analysis workbook: real numbers, percentages and dates in every cell (sortable,
//           chartable), one sheet per view plus every request with all its fields.
//   CSV   – the raw request list, for other tools.
//
// Every view is defined once below (column types + values) and rendered by each format, so the
// screen, PDF and Excel always agree. Export libraries load only when someone downloads.

export type Stat = { count: number; avg: number | null; median: number | null; p90: number | null; max: number | null };
export type MetCount = { met: number; of: number; pct: number | null };

type Counts = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  cancelled: number;
  merged: number;
  completed: number;
  completionPct: number | null;
};

export type GroupRow = Counts & {
  key: string | number;
  label: string;
  color: string | null;
  avgDispatchMin: number | null;
  avgArriveMin: number | null;
  avgResolveMin: number | null;
  arriveMetPct: number | null;
  resolveMetPct: number | null;
};

export type TeamRow = {
  teamId: number;
  code: string;
  label: string;
  isReserve: boolean;
  jobs: number;
  resolved: number;
  recalled: number;
  active: number;
  viaReserve: number;
  travel: Stat;
  work: Stat;
  membersSent: number;
  headcount: number;
};

export type OnTimeRow = {
  label: string;
  color: string | null;
  total: number;
  targets: { dispatch: number; arrive: number; resolve: number } | null;
  dispatch: MetCount;
  arrive: MetCount;
  resolve: MetCount;
  arriveMedian: number | null;
  arriveP90: number | null;
  resolveMedian: number | null;
  resolveP90: number | null;
};

export type ExceptionRow = {
  id: number;
  code: string;
  requestedAt: string;
  priority: { labelEn: string; color: string; rank: number };
  zone: { code: string; labelEn: string };
  location: string;
  issueType: string;
  teams: string;
  status: string;
  kind: "OPEN_OVERDUE" | "LATE";
  step: string;
  targetMin: number;
  actualMin: number;
  overMin: number;
};

export type ReportRow = {
  id: number;
  code: string;
  date: string;
  hour: number;
  requestedAt: string;
  dispatchedAt: string | null;
  arrivedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  zone: { id: number; code: string; labelEn: string };
  location: string;
  issueType: { labelEn: string };
  priority: { labelEn: string; color: string };
  targets: { dispatch: number; arrive: number; resolve: number };
  status: { code: string; labelEn: string; color: string };
  department: string;
  caller: string;
  membersNeeded: number;
  membersSent: number;
  headcount: number;
  teams: string;
  actionTaken: string;
  manpowerAsks: number;
  raisedBy: string;
  isDrill: boolean;
  isBackEntry: boolean;
  dispatchMin: number | null;
  arriveMin: number | null;
  resolveMin: number | null;
  closeMin: number | null;
  dispatchMet: boolean | null;
  arriveMet: boolean | null;
  resolveMet: boolean | null;
};

export type Report = {
  generatedAt: string;
  event: { id: number; code: string; name: string; timezone: string };
  filters: { from?: string; to?: string; zoneId?: number; teamId: number | null; teamCode: string | null; priorityId?: number; issueTypeId?: number; includeDrill: boolean };
  scope: "ALL" | "ZONE" | "TEAM" | "OWN";
  summary: Counts & {
    dispatch: Stat;
    arrive: Stat;
    resolve: Stat;
    close: Stat;
    dispatchMetPct: number | null;
    arriveMetPct: number | null;
    resolveMetPct: number | null;
    membersSent: number;
    headcount: number;
    backEntries: number;
    drills: number;
    manpowerAsks: number;
    teamsUsed: number;
  };
  findings: string[];
  onTime: OnTimeRow[];
  onTimeAll: OnTimeRow;
  exceptions: ExceptionRow[];
  byDay: (Counts & { date: string; avgArriveMin: number | null; avgResolveMin: number | null })[];
  byHour: { hour: number; total: number; completed: number }[];
  byDayHour: { date: string; hour: number; total: number }[];
  byZone: GroupRow[];
  byIssueType: GroupRow[];
  byPriority: GroupRow[];
  byStatus: { key: string; label: string; color: string | null; total: number }[];
  byTeam: TeamRow[];
  rows: ReportRow[];
};

/** Human description of the filters, printed on every export. */
export type FilterText = { label: string; value: string }[];

// ───────── formatting ─────────

/** Minutes for people: 45 s · 4.2 min · 2 h 5 min. */
export function fmtMin(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  if (v < 1) return `${Math.round(v * 60)} s`;
  if (v < 60) return `${Number(v.toFixed(1))} min`;
  return `${Math.floor(v / 60)} h ${Math.round(v % 60)} min`;
}
export const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);
export const metText = (m: MetCount) => (m.of ? `${m.pct}% (${m.met} of ${m.of})` : "—");

function zonedParts(iso: string, tz: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

export function zoned(iso: string | null, tz: string, withDate = true) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    ...(withDate && { day: "2-digit", month: "short" }),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/** The event's wall-clock time as a Date whose UTC fields hold it (what Excel stores). */
const excelDate = (iso: string, tz: string) => {
  const p = zonedParts(iso, tz);
  return new Date(Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi));
};

// ───────── one definition per view ─────────

export type Fmt = "text" | "int" | "min" | "pct" | "dt";
export type Col = { h: string; f?: Fmt };
export type Cell = string | number | null;
export type Table = { name: string; title: string; cols: Col[]; rows: Cell[][] };

/** A cell as text for the screen, PDF and CSV. */
export function cellText(v: Cell, f: Fmt = "text", tz = "Asia/Kolkata"): string {
  if (v === null || v === "") return f === "text" ? "" : "—";
  if (f === "min") return fmtMin(v as number);
  if (f === "pct") return `${v}%`;
  if (f === "dt") return zoned(v as string, tz);
  return String(v);
}

const T = (h: string): Col => ({ h });
const I = (h: string): Col => ({ h, f: "int" });
const M = (h: string): Col => ({ h, f: "min" });
const P = (h: string): Col => ({ h, f: "pct" });
const D = (h: string): Col => ({ h, f: "dt" });

const groupTable = (name: string, first: string, rows: GroupRow[]): Table => ({
  name,
  title: name,
  cols: [T(first), I("Requests"), I("Completed"), I("Open / in progress"), I("Cancelled"), P("Completed %"), M("Avg arrive"), P("Arrived on time"), M("Avg resolve"), P("Resolved on time")],
  rows: rows.map((g) => [g.label, g.total, g.completed, g.open + g.inProgress, g.cancelled + g.merged, g.completionPct, g.avgArriveMin, g.arriveMetPct, g.avgResolveMin, g.resolveMetPct]),
});

export function reportTables(r: Report) {
  const onTime: Table = {
    name: "On time",
    title: "On time, by priority (times from the call; targets set per priority)",
    cols: [T("Priority"), T("Targets send / arrive / resolve"), I("Requests"), P("Sent on time"), P("Arrived on time"), P("Resolved on time"), I("Arrivals measured"), M("Typical arrive"), M("Slowest 10% arrive"), M("Typical resolve"), M("Slowest 10% resolve")],
    rows: [...r.onTime, r.onTimeAll].map((p) => [
      p.label,
      p.targets && p.label !== "All priorities" ? `${p.targets.dispatch} / ${p.targets.arrive} / ${p.targets.resolve} min` : "",
      p.total,
      p.dispatch.pct,
      p.arrive.pct,
      p.resolve.pct,
      p.arrive.of,
      p.arriveMedian,
      p.arriveP90,
      p.resolveMedian,
      p.resolveP90,
    ]),
  };
  const exceptions: Table = {
    name: "Exceptions",
    title: "Exceptions: still open past target, or finished late",
    cols: [T("Request"), D("Raised"), T("Priority"), T("Zone"), T("Location"), T("Issue"), T("Team"), T("Problem"), M("Target"), M("Took"), M("Over by"), T("Status")],
    rows: r.exceptions.map((e) => [
      e.code,
      e.requestedAt,
      e.priority.labelEn,
      e.zone.code,
      e.location,
      e.issueType,
      e.teams || "—",
      e.kind === "OPEN_OVERDUE" ? `Still open: ${e.step.toLowerCase()} overdue` : `Late: ${e.step.toLowerCase()}`,
      e.targetMin,
      e.actualMin,
      e.overMin,
      e.status,
    ]),
  };
  const byDay: Table = {
    name: "By day",
    title: "Requests per day",
    cols: [T("Date"), I("Requests"), I("Completed"), I("Open / in progress"), I("Cancelled"), P("Completed %"), M("Avg arrive"), M("Avg resolve")],
    rows: r.byDay.map((d) => [d.date, d.total, d.completed, d.open + d.inProgress, d.cancelled + d.merged, d.completionPct, d.avgArriveMin, d.avgResolveMin]),
  };
  const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
  const busy: Table = {
    name: "Busy hours",
    title: "Requests by day and hour",
    cols: [T("Date"), ...hours.map((h) => I(h)), I("Total")],
    rows: r.byDay.map((d) => {
      const cells = hours.map((_, h) => r.byDayHour.find((x) => x.date === d.date && x.hour === h)?.total ?? 0);
      return [d.date, ...cells, d.total];
    }),
  };
  const byTeam: Table = {
    name: "By team",
    title: "Teams (travel = sent to arrived; work = arrived to resolved)",
    cols: [T("Team"), I("Jobs"), I("Resolved"), I("Still on job"), I("Recalled"), I("Via reserve"), M("Avg travel"), M("Slowest 10% travel"), M("Avg work"), I("Members sent"), I("Headcount")],
    rows: r.byTeam.map((t) => [`${t.code} · ${t.label}`, t.jobs, t.resolved, t.active, t.recalled, t.viaReserve, t.travel.avg, t.travel.p90, t.work.avg, t.membersSent, t.headcount]),
  };
  const requestsFull: Table = {
    name: "Requests",
    title: "All requests",
    cols: [
      T("Request"),
      D("Raised"),
      T("Zone"),
      T("Location"),
      T("Issue"),
      T("Priority"),
      T("Status"),
      T("Teams"),
      D("Team sent"),
      D("Arrived"),
      D("Resolved"),
      D("Closed"),
      M("Send (min)"),
      M("Arrive (min)"),
      M("Resolve (min)"),
      T("Sent on time"),
      T("Arrived on time"),
      T("Resolved on time"),
      I("Members needed"),
      I("Members sent"),
      I("Headcount"),
      I("Manpower asks"),
      T("Caller"),
      T("Department"),
      T("Action taken"),
      T("Raised by"),
      T("Back-entry"),
      T("Drill"),
    ],
    rows: r.rows.map((x) => {
      const yn = (b: boolean | null) => (b === null ? "" : b ? "Yes" : "No");
      return [
        x.code,
        x.requestedAt,
        `${x.zone.code} · ${x.zone.labelEn}`,
        x.location,
        x.issueType.labelEn,
        x.priority.labelEn,
        x.status.labelEn,
        x.teams,
        x.dispatchedAt,
        x.arrivedAt,
        x.resolvedAt,
        x.closedAt,
        x.dispatchMin,
        x.arriveMin,
        x.resolveMin,
        yn(x.dispatchMet),
        yn(x.arriveMet),
        yn(x.resolveMet),
        x.membersNeeded,
        x.membersSent,
        x.headcount,
        x.manpowerAsks,
        x.caller,
        x.department,
        x.actionTaken,
        x.raisedBy,
        x.isBackEntry ? "Yes" : "",
        x.isDrill ? "Yes" : "",
      ];
    }),
  };
  return {
    onTime,
    exceptions,
    byDay,
    busy,
    byZone: groupTable("By zone", "Zone", r.byZone),
    byIssueType: groupTable("By issue type", "Issue type", r.byIssueType),
    byTeam,
    requestsFull,
  };
}

/** The headline numbers, shared by the screen and the PDF. */
export function headline(r: Report) {
  const s = r.summary;
  const all = r.onTimeAll;
  return [
    { label: "Requests", value: String(s.total), sub: s.drills ? `incl. ${s.drills} drill` : "" },
    { label: "Completed", value: String(s.completed), sub: `${pct(s.completionPct)} of all` },
    { label: "Open / in progress", value: String(s.open + s.inProgress), sub: `${s.open} open · ${s.inProgress} in progress` },
    { label: "Cancelled / merged", value: String(s.cancelled + s.merged), sub: "" },
    { label: "Typical arrive", value: fmtMin(s.arrive.median), sub: s.arrive.count ? `slowest 10%: ${fmtMin(s.arrive.p90)}` : "no arrivals yet" },
    { label: "Typical resolve", value: fmtMin(s.resolve.median), sub: s.resolve.count ? `slowest 10%: ${fmtMin(s.resolve.p90)}` : "none resolved yet" },
    { label: "Arrived on time", value: pct(all.arrive.pct), sub: all.arrive.of ? `${all.arrive.met} of ${all.arrive.of} measured` : "", tone: tone(all.arrive) },
    { label: "Resolved on time", value: pct(all.resolve.pct), sub: all.resolve.of ? `${all.resolve.met} of ${all.resolve.of} measured` : "", tone: tone(all.resolve) },
  ];
}

/** Good at 90%+ of at least 5 measured; too few measured is not judged. */
export function tone(m: MetCount): "good" | "bad" | "few" | undefined {
  if (!m.of) return undefined;
  if (m.of < 5) return "few";
  return (m.pct ?? 0) >= 90 ? "good" : "bad";
}

// ───────── downloads ─────────

export function fileBase(r: Report) {
  const range = r.filters.from || r.filters.to ? `${r.filters.from ?? "start"}_to_${r.filters.to ?? "today"}` : "all-dates";
  return `SMVS-108-report_${range}${r.filters.teamCode ? `_${r.filters.teamCode}` : ""}`;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV of one view (default: every request). Times as "YYYY-MM-DD HH:mm" in the event's time zone, minutes as plain numbers. */
export function downloadCsv(r: Report, table?: Table) {
  const t = table ?? reportTables(r).requestsFull;
  const tz = r.event.timezone;
  const out = (v: Cell, f: Fmt = "text") => {
    if (v === null) return "";
    if (f === "dt") {
      const p = zonedParts(v as string, tz);
      return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")} ${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
    }
    return String(v);
  };
  const text = [t.cols.map((c) => csvCell(c.h)), ...t.rows.map((row) => row.map((v, i) => csvCell(out(v, t.cols[i].f))))].map((x) => x.join(",")).join("\r\n");
  save(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }), `${fileBase(r)}_${t.name.toLowerCase().replace(/\s+/g, "-")}.csv`);
}

/** Excel workbook: Summary first (filters, headline numbers, findings), then one sheet per view. */
export async function downloadExcel(r: Report, filters: FilterText) {
  const ExcelJS = (await import("exceljs")).default;
  const tz = r.event.timezone;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SMVS 108";
  wb.created = new Date();
  const RED = "FFB91C1C";

  const sum = wb.addWorksheet("Summary");
  sum.getColumn(1).width = 30;
  sum.getColumn(2).width = 24;
  sum.getColumn(3).width = 40;
  sum.addRow([`SMVS 108 report · ${r.event.name}`]).font = { bold: true, size: 14 };
  sum.addRow([`Generated ${zoned(r.generatedAt, tz)} (${tz})`]).font = { color: { argb: "FF666666" } };
  sum.addRow([]);
  for (const f of filters) sum.addRow([f.label, f.value]);
  sum.addRow([]);
  sum.addRow(["Headline numbers"]).font = { bold: true, size: 12 };
  for (const h of headline(r)) sum.addRow([h.label, h.value, h.sub]);
  sum.addRow([]);
  sum.addRow(["Findings"]).font = { bold: true, size: 12 };
  for (const f of r.findings) {
    const row = sum.addRow([f]);
    sum.mergeCells(row.number, 1, row.number, 3);
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = Math.max(15, Math.ceil(f.length / 95) * 15);
  }

  const t = reportTables(r);
  for (const table of [t.onTime, t.exceptions, t.byDay, t.busy, t.byZone, t.byIssueType, t.byTeam, t.requestsFull]) {
    const ws = wb.addWorksheet(table.name.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRow(table.cols.map((c) => c.h));
    for (const row of table.rows) {
      const added = ws.addRow(
        row.map((v, i) => {
          const f = table.cols[i].f;
          if (v === null || v === "") return null;
          if (f === "pct") return Math.round((v as number) * 10) / 1000;
          if (f === "dt") return excelDate(v as string, tz);
          if (f === "min") return Math.round((v as number) * 10) / 10;
          return v;
        }),
      );
      table.cols.forEach((c, i) => {
        const cell = added.getCell(i + 1);
        if (c.f === "pct") cell.numFmt = "0.0%";
        else if (c.f === "min") cell.numFmt = "0.0";
        else if (c.f === "dt") cell.numFmt = "dd mmm yyyy hh:mm";
      });
    }
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
    header.alignment = { vertical: "middle", wrapText: true };
    header.height = 30;
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: table.cols.length } };
    table.cols.forEach((c, i) => {
      const longest = Math.max(...table.rows.slice(0, 300).map((row) => cellText(row[i], c.f, tz).length), 4);
      ws.getColumn(i + 1).width = table.name === "Busy hours" && i > 0 ? 5 : Math.min(Math.max(longest + 2, Math.min(c.h.length, 18), 8), 48);
    });
    if (table.name.startsWith("Busy")) {
      const max = Math.max(1, ...r.byDayHour.map((x) => x.total));
      ws.eachRow((row, n) => {
        if (n === 1) return;
        for (let c = 2; c <= 25; c++) {
          const v = Number(row.getCell(c).value ?? 0);
          if (v > 0) row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${heatHex(v / max).slice(1)}` } };
          if (v / max > 0.55) row.getCell(c).font = { color: { argb: "FFFFFFFF" } };
        }
      });
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  save(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${fileBase(r)}.xlsx`);
}

/** Sequential blue (one hue, light → dark) for the busy-hours grid; 0 < share ≤ 1. */
export const HEAT = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
export const heatHex = (share: number) => HEAT[Math.min(HEAT.length - 1, Math.max(0, Math.ceil(share * HEAT.length) - 1))];

/** jsPDF's built-in fonts are Latin-1: replace anything else so nothing prints as garbage. */
const safe = (s: string) =>
  s
    .replace(/→/g, "->")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

/** PDF (A4 landscape) for the 108 Head: the answer first, detail after. */
export async function downloadPdf(r: Report, filters: FilterText) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 12;
  const tz = r.event.timezone;
  const t = reportTables(r);
  const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as [number, number, number];
  const RED: [number, number, number] = [185, 28, 28];
  const ink = () => doc.setTextColor(20);
  const quiet = () => doc.setTextColor(100);
  const heading = (text: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    ink();
    doc.text(safe(text), M, y);
    doc.setFont("helvetica", "normal");
  };
  let y = 0;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  /** A table from the shared definitions; starts a new page when there is not enough room. */
  const table = (tb: Table, opts: { cols?: number[]; font?: number; need?: number; maxRows?: number } = {}) => {
    const idx = opts.cols ?? tb.cols.map((_, i) => i);
    const rows = opts.maxRows ? tb.rows.slice(0, opts.maxRows) : tb.rows;
    if (y + (opts.need ?? 30) > H - 16) {
      doc.addPage();
      y = 16;
    }
    heading(tb.title, y);
    autoTable(doc, {
      startY: y + 3,
      head: [idx.map((i) => safe(tb.cols[i].h))],
      body: rows.map((row) => idx.map((i) => safe(cellText(row[i], tb.cols[i].f, tz)))),
      margin: { left: M, right: M, bottom: 14 },
      styles: { fontSize: opts.font ?? 8.5, cellPadding: 1.4, overflow: "linebreak", textColor: 20 },
      headStyles: { fillColor: RED, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 247, 245] },
    });
    y = lastY() + (opts.maxRows && tb.rows.length > opts.maxRows ? 4 : 10);
    if (opts.maxRows && tb.rows.length > opts.maxRows) {
      quiet();
      doc.setFontSize(8);
      doc.text(`+ ${tb.rows.length - opts.maxRows} more in the Excel download`, M, y);
      y += 8;
    }
  };

  // ── Page 1: title, headline numbers, findings, two charts
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  ink();
  doc.text(safe(`SMVS 108 report · ${r.event.name}`), M, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  quiet();
  doc.text(safe(`Generated ${zoned(r.generatedAt, tz)} (${tz})   ·   ${filters.map((f) => `${f.label}: ${f.value}`).join("   ·   ")}`), M, 21, { maxWidth: W - 2 * M });

  const tiles = headline(r);
  const tw = (W - 2 * M - 7 * 3) / 8;
  tiles.forEach((tile, i) => {
    const x = M + i * (tw + 3);
    doc.setDrawColor(215);
    doc.roundedRect(x, 26, tw, 21, 2, 2);
    doc.setFontSize(7.5);
    quiet();
    doc.text(safe(tile.label), x + 2.5, 31);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    if (tile.tone === "bad") doc.setTextColor(185, 28, 28);
    else if (tile.tone === "good") doc.setTextColor(21, 128, 61);
    else ink();
    doc.text(safe(tile.value), x + 2.5, 39);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    quiet();
    doc.text(safe(tile.sub), x + 2.5, 44, { maxWidth: tw - 4 });
  });

  heading("Findings", 57);
  doc.setFontSize(9.5);
  ink();
  y = 63;
  for (const f of r.findings) {
    const lines = doc.splitTextToSize(safe(f), W - 2 * M - 6);
    doc.text("-", M, y);
    doc.text(lines, M + 4, y);
    y += lines.length * 4.6 + 1.2;
  }

  const bars = (title: string, items: { label: string; value: number }[], x: number, y0: number, w: number, h: number) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    ink();
    doc.text(safe(title), x, y0);
    doc.setFont("helvetica", "normal");
    const top = y0 + 5;
    const plotH = h - 16;
    const max = Math.max(1, ...items.map((i) => i.value));
    const slot = w / Math.max(items.length, 1);
    const bw = Math.max(1, Math.min(slot * 0.65, 14));
    doc.setDrawColor(200);
    doc.line(x, top + plotH, x + w, top + plotH);
    doc.setFontSize(7);
    const every = Math.ceil(items.length / 14);
    items.forEach((it, i) => {
      const bh = (it.value / max) * plotH;
      const bx = x + i * slot + (slot - bw) / 2;
      doc.setFillColor(42, 120, 214);
      if (bh > 0) doc.roundedRect(bx, top + plotH - bh, bw, bh, Math.min(1, bw / 3), Math.min(1, bw / 3), "F");
      ink();
      if (it.value > 0 && items.length <= 31) doc.text(String(it.value), bx + bw / 2, top + plotH - bh - 1.2, { align: "center" });
      quiet();
      if (i % every === 0) doc.text(safe(it.label), bx + bw / 2, top + plotH + 4, { align: "center" });
    });
  };
  const chartY = Math.max(y + 6, 118);
  if (chartY + 60 < H - 12) {
    const half = (W - 2 * M - 12) / 2;
    bars("Requests per day", r.byDay.map((d) => ({ label: d.date.slice(5), value: d.total })), M, chartY, half, H - 14 - chartY);
    bars("Requests by zone", r.byZone.map((z) => ({ label: z.label.split(" · ")[0], value: z.total })), M + half + 12, chartY, half, H - 14 - chartY);
  }

  // ── Page 2: on time by priority, busy hours, teams
  doc.addPage();
  y = 16;
  table(t.onTime, { need: 40 });

  const days = r.byDay.slice(-14);
  if (days.length) {
    const cell = Math.min(10, (W - 2 * M - 26) / 24);
    const gridH = days.length * 6 + 18;
    if (y + gridH > H - 16) {
      doc.addPage();
      y = 16;
    }
    heading(`Busy hours: requests by day and hour${r.byDay.length > 14 ? " (last 14 days)" : ""}`, y);
    const max = Math.max(1, ...r.byDayHour.map((x) => x.total));
    const gx = M + 22;
    const gy = y + 8;
    doc.setFontSize(6.5);
    quiet();
    for (let h = 0; h < 24; h += 1) doc.text(String(h).padStart(2, "0"), gx + h * cell + cell / 2, gy - 1, { align: "center" });
    days.forEach((d, i) => {
      quiet();
      doc.setFontSize(7);
      doc.text(d.date, M, gy + i * 6 + 4);
      for (let h = 0; h < 24; h++) {
        const v = r.byDayHour.find((x) => x.date === d.date && x.hour === h)?.total ?? 0;
        if (v) doc.setFillColor(...hex(heatHex(v / max)));
        else doc.setFillColor(240, 239, 236);
        doc.rect(gx + h * cell + 0.3, gy + i * 6 + 0.3, cell - 0.6, 5.4, "F");
        if (v) {
          doc.setFontSize(6.5);
          if (v / max > 0.55) doc.setTextColor(255);
          else ink();
          doc.text(String(v), gx + h * cell + cell / 2, gy + i * 6 + 4, { align: "center" });
        }
      }
    });
    y = gy + days.length * 6 + 10;
  }
  table(t.byTeam, { need: 30 });

  // ── Exceptions, zones, issue types
  table(t.exceptions, { need: 40, maxRows: 60 });
  table(t.byZone, { need: 40 });
  table(t.byIssueType, { need: 40 });

  // ── Request list: the columns a reader needs, at a readable size
  y = Infinity; // always starts on its own page
  table(t.requestsFull, { cols: [0, 1, 2, 4, 5, 7, 12, 13, 14, 6], font: 8 });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    quiet();
    doc.text(safe(`SMVS 108 · ${r.event.name} · page ${i} of ${pages}`), W - M, H - 6, { align: "right" });
  }
  doc.save(`${fileBase(r)}.pdf`);
}
