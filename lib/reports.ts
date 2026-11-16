// Report payload (GET /reports) and its downloads: CSV, Excel (.xlsx) and PDF.
// The export libraries are loaded only when someone downloads, so the page stays light.

export type Stat = { count: number; avg: number | null; median: number | null; p90: number | null; max: number | null };

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
  travel: Stat;
  work: Stat;
  membersSent: number;
  headcount: number;
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
  byDay: (Counts & { date: string; avgArriveMin: number | null; avgResolveMin: number | null })[];
  byHour: { hour: number; total: number; completed: number }[];
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

export const num = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? "—" : Number(v.toFixed(digits)).toString());
export const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);
export const met = (v: boolean | null) => (v === null ? "" : v ? "Yes" : "No");

export function zoned(iso: string | null, tz: string, withDate = true) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    ...(withDate && { day: "2-digit", month: "short", year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00–${String((h + 1) % 24).padStart(2, "0")}:00`;

// ───────── one set of tables, shared by every format ─────────

type Table = { name: string; title: string; head: string[]; rows: (string | number)[][] };

const timingRow = (name: string, s: Stat, metPct: number | null) => [name, s.count, num(s.avg), num(s.median), num(s.p90), num(s.max), pct(metPct)];

const groupTable = (name: string, title: string, first: string, rows: GroupRow[]): Table => ({
  name,
  title,
  head: [first, "Requests", "Completed", "Open / in progress", "Cancelled", "Completed %", "Avg dispatch (min)", "Avg arrive (min)", "Avg resolve (min)", "Arrive on target", "Resolve on target"],
  rows: rows.map((g) => [
    g.label,
    g.total,
    g.completed,
    g.open + g.inProgress,
    g.cancelled + g.merged,
    pct(g.completionPct),
    num(g.avgDispatchMin),
    num(g.avgArriveMin),
    num(g.avgResolveMin),
    pct(g.arriveMetPct),
    pct(g.resolveMetPct),
  ]),
});

export function reportTables(r: Report): Table[] {
  const s = r.summary;
  const tz = r.event.timezone;
  return [
    {
      name: "Summary",
      title: "Summary",
      head: ["Measure", "Value"],
      rows: [
        ["Total requests", s.total],
        ["Completed (resolved or closed)", s.completed],
        ["  of which closed", s.closed],
        ["  of which resolved, waiting to be closed", s.resolved],
        ["Completed %", pct(s.completionPct)],
        ["Open (no team yet)", s.open],
        ["In progress (team sent or on site)", s.inProgress],
        ["Cancelled", s.cancelled],
        ["Merged into another request", s.merged],
        ["Average time to send a team (min)", num(s.dispatch.avg)],
        ["Average time to arrive (min)", num(s.arrive.avg)],
        ["Average time to resolve (min)", num(s.resolve.avg)],
        ["Sent within target", pct(s.dispatchMetPct)],
        ["Arrived within target", pct(s.arriveMetPct)],
        ["Resolved within target", pct(s.resolveMetPct)],
        ["Teams used", s.teamsUsed],
        ["Members sent (total)", s.membersSent],
        ["People handled (headcount)", s.headcount],
        ["Requests for more manpower", s.manpowerAsks],
        ["Entered later (back-entry)", s.backEntries],
        ["Drill requests included", s.drills],
      ],
    },
    {
      name: "Timing",
      title: "Response times, minutes from the call (target = the priority's target)",
      head: ["Step", "Measured", "Average", "Median", "Slowest 10% (P90)", "Longest", "Within target"],
      rows: [
        timingRow("Team sent", s.dispatch, s.dispatchMetPct),
        timingRow("Team arrived", s.arrive, s.arriveMetPct),
        timingRow("Resolved", s.resolve, s.resolveMetPct),
        timingRow("Closed", s.close, null),
      ],
    },
    {
      name: "By day",
      title: "Requests per day",
      head: ["Date", "Requests", "Completed", "Open / in progress", "Cancelled", "Completed %", "Avg arrive (min)", "Avg resolve (min)"],
      rows: r.byDay.map((d) => [d.date, d.total, d.completed, d.open + d.inProgress, d.cancelled + d.merged, pct(d.completionPct), num(d.avgArriveMin), num(d.avgResolveMin)]),
    },
    {
      name: "By hour",
      title: "Requests by hour of day",
      head: ["Hour", "Requests", "Completed"],
      rows: r.byHour.map((h) => [hourLabel(h.hour), h.total, h.completed]),
    },
    groupTable("By zone", "By zone", "Zone", r.byZone),
    {
      name: "By team",
      title: "Team performance (travel = sent → arrived; work = arrived → resolved)",
      head: ["Team", "Jobs", "Resolved", "Recalled", "Still on job", "Avg travel (min)", "P90 travel (min)", "Avg work (min)", "Members sent", "Headcount"],
      rows: r.byTeam.map((t) => [`${t.code} · ${t.label}`, t.jobs, t.resolved, t.recalled, t.active, num(t.travel.avg), num(t.travel.p90), num(t.work.avg), t.membersSent, t.headcount]),
    },
    groupTable("By issue type", "By issue type", "Issue type", r.byIssueType),
    groupTable("By priority", "By priority", "Priority", r.byPriority),
    {
      name: "By status",
      title: "Current status",
      head: ["Status", "Requests"],
      rows: r.byStatus.map((x) => [x.label, x.total]),
    },
    {
      name: "Requests",
      title: "All requests",
      head: [
        "Request",
        "Date",
        "Raised at",
        "Zone",
        "Location",
        "Issue",
        "Priority",
        "Status",
        "Teams",
        "Team sent",
        "Arrived",
        "Resolved",
        "Closed",
        "Send (min)",
        "Arrive (min)",
        "Resolve (min)",
        "Sent in target",
        "Arrived in target",
        "Resolved in target",
        "Members needed",
        "Members sent",
        "Headcount",
        "Caller",
        "Department",
        "Action taken",
        "Raised by",
        "Back-entry",
        "Drill",
      ],
      rows: r.rows.map((x) => [
        x.code,
        x.date,
        zoned(x.requestedAt, tz, false),
        `${x.zone.code} · ${x.zone.labelEn}`,
        x.location,
        x.issueType.labelEn,
        x.priority.labelEn,
        x.status.labelEn,
        x.teams,
        zoned(x.dispatchedAt, tz),
        zoned(x.arrivedAt, tz),
        zoned(x.resolvedAt, tz),
        zoned(x.closedAt, tz),
        num(x.dispatchMin),
        num(x.arriveMin),
        num(x.resolveMin),
        met(x.dispatchMet),
        met(x.arriveMet),
        met(x.resolveMet),
        x.membersNeeded,
        x.membersSent,
        x.headcount,
        x.caller,
        x.department,
        x.actionTaken,
        x.raisedBy,
        x.isBackEntry ? "Yes" : "",
        x.isDrill ? "Yes" : "",
      ]),
    },
  ];
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

const csvCell = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of one table (default: every request). UTF-8 with BOM so Excel shows Gujarati correctly. */
export function downloadCsv(r: Report, tableName = "Requests") {
  const t = reportTables(r).find((x) => x.name === tableName)!;
  const text = [t.head, ...t.rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  save(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }), `${fileBase(r)}_${tableName.toLowerCase().replace(/\s+/g, "-")}.csv`);
}

/** Excel workbook: a Filters sheet, then one sheet per table, with frozen headers and filters. */
export async function downloadExcel(r: Report, filters: FilterText) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SMVS 108";
  wb.created = new Date();

  const info = wb.addWorksheet("Report");
  info.addRow([`SMVS 108 report · ${r.event.name}`]).font = { bold: true, size: 14 };
  info.addRow([`Generated ${zoned(r.generatedAt, r.event.timezone)} (${r.event.timezone})`]);
  info.addRow([]);
  for (const f of filters) info.addRow([f.label, f.value]);
  info.getColumn(1).width = 28;
  info.getColumn(2).width = 50;

  for (const t of reportTables(r)) {
    const ws = wb.addWorksheet(t.name.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRow(t.head);
    for (const row of t.rows) ws.addRow(row.map((v) => (typeof v === "string" && v !== "" && v !== "—" && !Number.isNaN(Number(v)) && !/^\d{4}-/.test(v) ? Number(v) : v)));
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } };
    header.alignment = { vertical: "middle", wrapText: true };
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: t.head.length } };
    t.head.forEach((h, i) => {
      const longest = Math.max(h.length, ...t.rows.slice(0, 200).map((row) => String(row[i] ?? "").length));
      ws.getColumn(i + 1).width = Math.min(Math.max(longest + 2, 10), 50);
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  save(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${fileBase(r)}.xlsx`);
}

/** PDF (A4 landscape): headline numbers, two bar charts, then every table. */
export async function downloadPdf(r: Report, filters: FilterText) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 12;
  const s = r.summary;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`SMVS 108 report · ${r.event.name}`, M, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`Generated ${zoned(r.generatedAt, r.event.timezone)} (${r.event.timezone})`, M, 22);
  doc.text(filters.map((f) => `${f.label}: ${f.value}`).join("   ·   "), M, 27, { maxWidth: W - 2 * M });
  doc.setTextColor(0);

  // Headline tiles
  const tiles: [string, string][] = [
    ["Requests", String(s.total)],
    ["Completed", `${s.completed} (${pct(s.completionPct)})`],
    ["Open / in progress", String(s.open + s.inProgress)],
    ["Cancelled", String(s.cancelled + s.merged)],
    ["Avg arrive", `${num(s.arrive.avg)} min`],
    ["Avg resolve", `${num(s.resolve.avg)} min`],
    ["Arrived in target", pct(s.arriveMetPct)],
    ["Resolved in target", pct(s.resolveMetPct)],
  ];
  const tw = (W - 2 * M - 7 * 3) / 8;
  tiles.forEach(([label, value], i) => {
    const x = M + i * (tw + 3);
    doc.setDrawColor(220);
    doc.roundedRect(x, 32, tw, 18, 2, 2);
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(label, x + 3, 37);
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + 3, 45);
    doc.setFont("helvetica", "normal");
  });

  // Simple single-series bar charts drawn directly in the PDF
  const bars = (title: string, items: { label: string; value: number }[], x: number, y: number, w: number, h: number) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title, x, y);
    doc.setFont("helvetica", "normal");
    const top = y + 4;
    const plotH = h - 14;
    const max = Math.max(1, ...items.map((i) => i.value));
    const slot = w / Math.max(items.length, 1);
    const bw = Math.max(1, Math.min(slot * 0.7, 12));
    doc.setDrawColor(200);
    doc.line(x, top + plotH, x + w, top + plotH);
    doc.setFontSize(6.5);
    const every = Math.ceil(items.length / 16);
    items.forEach((it, i) => {
      const bh = (it.value / max) * plotH;
      const bx = x + i * slot + (slot - bw) / 2;
      doc.setFillColor(42, 120, 214);
      if (bh > 0) doc.rect(bx, top + plotH - bh, bw, bh, "F");
      if (it.value > 0 && items.length <= 31) doc.text(String(it.value), bx + bw / 2, top + plotH - bh - 1, { align: "center" });
      if (i % every === 0) doc.text(it.label, bx + bw / 2, top + plotH + 4, { align: "center" });
    });
  };
  const half = (W - 2 * M - 10) / 2;
  bars("Requests per day", r.byDay.map((d) => ({ label: d.date.slice(5), value: d.total })), M, 60, half, 60);
  bars("Requests by hour of day", r.byHour.map((h) => ({ label: String(h.hour).padStart(2, "0"), value: h.total })), M + half + 10, 60, half, 60);

  // Tables follow one another; a new page when the next would start too low, and the
  // long request list always starts on its own page.
  let y = Infinity;
  for (const t of reportTables(r)) {
    if (t.name === "Summary") continue;
    const big = t.name === "Requests";
    let startY = y + 14;
    if (big || startY > 170) {
      doc.addPage();
      startY = 18;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(t.title, M, startY - 4);
    doc.setFont("helvetica", "normal");
    const head = big ? t.head.filter((_, i) => ![22, 23, 26, 27].includes(i)) : t.head;
    const body = big ? t.rows.map((row) => row.filter((_, i) => ![22, 23, 26, 27].includes(i))) : t.rows;
    autoTable(doc, {
      startY,
      head: [head],
      body: body.map((row) => row.map((v) => String(v))),
      margin: { left: M, right: M },
      styles: { fontSize: big ? 5.5 : 8, cellPadding: big ? 0.8 : 1.5, overflow: "linebreak" },
      headStyles: { fillColor: [185, 28, 28], textColor: 255 },
      alternateRowStyles: { fillColor: [247, 247, 245] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`SMVS 108 · page ${i} of ${pages}`, W - M, doc.internal.pageSize.getHeight() - 6, { align: "right" });
  }
  doc.save(`${fileBase(r)}.pdf`);
}
