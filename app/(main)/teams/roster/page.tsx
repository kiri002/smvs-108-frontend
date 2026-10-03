"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState, Loading, PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { del, errorMessage, get, post } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLookups } from "@/lib/queries";
import { todayInTz } from "@/lib/time";

type RosterRow = { id: number; date: string; user: { id: number; name: string; mobile: string }; team: { id: number; code: string }; shift: { id: number; code: string }; position: { id: number; labelEn: string; labelGu: string; kind: string } };
type Coverage = { teamId: number; code: string; positions: { positionId: number; code: string; labelEn: string; count: number; minCount: number; maxCount: number; short: boolean }[] }[];
type UserRow = { id: number; name: string; mobile: string; teamId: number | null };

/** FR-M4-04: who is on duty, where, for each date and shift. */
export default function RosterPage() {
  const { t, label } = useI18n();
  const qc = useQueryClient();
  const lookups = useLookups();
  const [date, setDate] = React.useState(todayInTz());
  const [shiftId, setShiftId] = React.useState("");
  const [form, setForm] = React.useState({ userId: "", teamId: "", positionId: "" });

  React.useEffect(() => {
    if (!shiftId && lookups.data?.shifts[0]) setShiftId(String(lookups.data.shifts[0].id));
  }, [lookups.data, shiftId]);

  const roster = useQuery({ queryKey: ["roster", date, shiftId], queryFn: () => get<RosterRow[]>("/teams/roster", { date, shiftId }), enabled: !!shiftId });
  const coverage = useQuery({ queryKey: ["roster", "coverage", date, shiftId], queryFn: () => get<Coverage>("/teams/roster/coverage", { date, shiftId }), enabled: !!shiftId });
  const users = useQuery({ queryKey: ["users", "roster"], queryFn: () => get<UserRow[]>("/users") });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["roster"] });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await post("/teams/roster", { date, shiftId: Number(shiftId), userId: Number(form.userId), teamId: Number(form.teamId), positionId: Number(form.positionId) });
      setForm({ ...form, userId: "" });
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (lookups.isLoading) return <Loading />;
  if (lookups.error) return <ErrorState error={lookups.error} />;
  const cfg = lookups.data!;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("roster.title")} />
      <div className="flex flex-wrap gap-3">
        <Field label={t("roster.date")} htmlFor="r-date">
          <Input id="r-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </Field>
        <Field label={t("roster.shift")} htmlFor="r-shift">
          <Select id="r-shift" value={shiftId} onChange={(e) => setShiftId(e.target.value)} className="w-56">
            {cfg.shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)} ({s.startTime}–{s.endTime})
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <form onSubmit={add} className="bg-muted/30 flex flex-wrap items-end gap-3 rounded-lg border p-3">
        <Field label={t("roster.person")} htmlFor="r-user">
          <Select
            id="r-user"
            className="w-64"
            value={form.userId}
            onChange={(e) => {
              const u = users.data?.find((x) => String(x.id) === e.target.value);
              setForm({ ...form, userId: e.target.value, teamId: u?.teamId ? String(u.teamId) : form.teamId });
            }}
            required
          >
            <option value="">—</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.mobile}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("nav.teams")} htmlFor="r-team">
          <Select id="r-team" className="w-36" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} required>
            <option value="">—</option>
            {cfg.teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("roster.position")} htmlFor="r-pos">
          <Select id="r-pos" className="w-48" value={form.positionId} onChange={(e) => setForm({ ...form, positionId: e.target.value })} required>
            <option value="">—</option>
            {cfg.positions.map((p) => (
              <option key={p.id} value={p.id}>
                {label(p)}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit">
          <Plus /> {t("roster.add")}
        </Button>
      </form>

      {roster.isLoading ? (
        <Loading />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {coverage.data?.map((c) => {
            const rows = (roster.data ?? []).filter((r) => r.team.id === c.teamId);
            return (
              <div key={c.teamId} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-bold">{c.code}</span>
                  {c.positions.map((p) => (
                    <Badge key={p.positionId} variant={p.short ? "destructive" : "success"}>
                      {p.code} {p.count}/{p.minCount}
                    </Badge>
                  ))}
                </div>
                <ul className="grid gap-1 text-sm">
                  {rows.map((r) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <span className="text-muted-foreground w-24 truncate text-xs">{label(r.position)}</span>
                      <span className="flex-1 truncate">{r.user.name}</span>
                      <Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => void del(`/teams/roster/${r.id}`).then(refresh).catch((e) => toast.error(errorMessage(e)))}>
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                  {rows.length === 0 && <li className="text-muted-foreground text-xs">{t("common.noData")}</li>}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
