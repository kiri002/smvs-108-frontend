"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState, Loading, PageHeader } from "@/components/common/states";
import { ExtraFields, type ExtraValues } from "@/components/requests/extra-fields";
import { LocationPicker } from "@/components/requests/location-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { errorMessage, get, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLookups } from "@/lib/queries";
import { formatTime, fromLocalInput, toLocalInput } from "@/lib/time";
import type { Lookups } from "@/lib/types";
import { cn } from "@/lib/utils";

type Dupes = { windowMin: number; matches: { id: number; code: string; requestedAt: string; description: string; issueType: { labelEn: string; labelGu: string }; status: { labelEn: string; labelGu: string; color: string } }[] };

function IntakeForm({ cfg }: { cfg: Lookups }) {
  const { t, label } = useI18n();
  const { user, can } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const canBackEntry = !!can("INTAKE", "BACK_ENTRY");
  const zoneScoped = can("INTAKE", "CREATE") === "ZONE";

  const [liaisonId, setLiaisonId] = React.useState("");
  const [callerName, setCallerName] = React.useState("");
  const [callerMobile, setCallerMobile] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [locationId, setLocationId] = React.useState<number | null>(null);
  const [zoneId, setZoneId] = React.useState(zoneScoped && user?.zoneId ? String(user.zoneId) : "");
  const [landmark, setLandmark] = React.useState("");
  const [issueTypeId, setIssueTypeId] = React.useState<number | null>(null);
  const [priorityId, setPriorityId] = React.useState("");
  const [members, setMembers] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [extra, setExtra] = React.useState<ExtraValues>({});
  const [sameAsCaller, setSameAsCaller] = React.useState(false);
  const [contactName, setContactName] = React.useState("");
  const [contactMobile, setContactMobile] = React.useState("");
  const [isDrill, setIsDrill] = React.useState(false);
  const [selfAssign, setSelfAssign] = React.useState(params.get("self") === "1" && !!user?.teamId);
  const [backEntry, setBackEntry] = React.useState(false);
  const [be, setBe] = React.useState(() => ({ requestedAt: toLocalInput(new Date()), teamId: "", dispatchedAt: "", arrivedAt: "", resolvedAt: "", actionTaken: "", close: true }));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const location = cfg.locations.find((l) => l.id === locationId) ?? null;
  const effectiveZone = location?.zoneId ?? (zoneId ? Number(zoneId) : null);
  const issueType = cfg.issueTypes.find((i) => i.id === issueTypeId) ?? null;
  const fields = cfg.formFields.filter((f) => f.issueTypeId === null || f.issueTypeId === issueTypeId);
  const locations = zoneScoped && user?.zoneId ? cfg.locations.filter((l) => l.zoneId === user.zoneId) : cfg.locations;

  const dupes = useQuery({
    queryKey: ["dupes", locationId, effectiveZone, issueTypeId],
    queryFn: () => get<Dupes>("/requests/duplicates", { locationId: locationId ?? undefined, zoneId: effectiveZone ?? undefined, issueTypeId: issueTypeId ?? undefined }),
    enabled: !!locationId || (!!effectiveZone && !!issueTypeId),
  });

  const pickIssue = (id: number) => {
    const it = cfg.issueTypes.find((i) => i.id === id);
    setIssueTypeId(id);
    if (it) {
      setPriorityId(String(it.defaultPriorityId));
      setMembers(String(it.defaultMembers));
    }
  };

  const pickLiaison = (id: string) => {
    setLiaisonId(id);
    const l = cfg.liaisons.find((x) => String(x.id) === id);
    if (l) {
      setCallerName(l.name);
      setCallerMobile(l.mobile);
      setDepartmentId(String(l.departmentId));
    }
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!issueTypeId) return setError(t("intake.what"));
    if (!effectiveZone) return setError(t("intake.where"));
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        liaisonId: liaisonId || null,
        callerName,
        callerMobile,
        departmentId: departmentId || null,
        locationId,
        zoneId: effectiveZone,
        landmark,
        issueTypeId,
        priorityId: priorityId || null,
        membersNeeded: members ? Number(members) : undefined,
        description,
        extraFields: extra,
        contactSameAsCaller: sameAsCaller,
        contactName,
        contactMobile,
        isDrill,
        selfAssign,
      };
      if (backEntry) {
        body.backEntry = {
          requestedAt: fromLocalInput(be.requestedAt),
          teamId: be.teamId || null,
          dispatchedAt: fromLocalInput(be.dispatchedAt),
          arrivedAt: fromLocalInput(be.arrivedAt),
          resolvedAt: fromLocalInput(be.resolvedAt),
          actionTaken: be.actionTaken,
          close: be.close && !!be.resolvedAt,
        };
      }
      const res = await post<{ request: { id: number; code: string } }>("/requests", body);
      toast.success(t("intake.created", { code: res.request.code }));
      router.push(selfAssign ? "/my-assignment" : `/requests/${res.request.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void submit();
      }}
      className="grid gap-4 lg:grid-cols-2"
    >
      {/* WHERE */}
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>1. {t("intake.where")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 px-4">
          <Field label={t("intake.location")} htmlFor="location">
            <LocationPicker locations={locations} zones={cfg.zones} value={locationId} onChange={setLocationId} autoFocus />
          </Field>
          {!location && (
            <Field label={t("intake.zone")} htmlFor="zone">
              <Select id="zone" value={zoneId} onChange={(e) => setZoneId(e.target.value)} disabled={zoneScoped}>
                <option value="">—</option>
                {cfg.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.code} · {label(z)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={t("intake.landmark")} htmlFor="landmark">
            <Input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
          </Field>
          {dupes.data && dupes.data.matches.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="alert" data-testid="duplicate-warning">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4" />
                {t("intake.duplicates", { n: dupes.data.windowMin })}
              </div>
              <ul className="grid gap-1">
                {dupes.data.matches.map((m) => (
                  <li key={m.id}>
                    <Link href={`/requests/${m.id}`} className="font-mono font-semibold underline" target="_blank">
                      {m.code}
                    </Link>{" "}
                    · {label(m.issueType)} · {label(m.status)} · {formatTime(m.requestedAt)}
                    {m.description && ` · ${m.description}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WHAT */}
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>2. {t("intake.what")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 px-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("intake.issueType")}>
            {cfg.issueTypes.map((it) => {
              const p = cfg.priorities.find((x) => x.id === it.defaultPriorityId);
              const on = it.id === issueTypeId;
              return (
                <button
                  key={it.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pickIssue(it.id)}
                  className={cn("flex min-h-12 items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm font-medium transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p?.color }} />
                  {label(it)}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("intake.urgency")} htmlFor="priority">
              <Select id="priority" value={priorityId} onChange={(e) => setPriorityId(e.target.value)}>
                <option value="">—</option>
                {cfg.priorities.map((p) => (
                  <option key={p.id} value={p.id}>
                    {label(p)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("intake.howMany")} htmlFor="members">
              <Input id="members" type="number" min={1} inputMode="numeric" value={members} onChange={(e) => setMembers(e.target.value)} />
            </Field>
          </div>
          <Field label={t("intake.description")} htmlFor="description">
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Crowd growing near the barrier" />
          </Field>
          {issueType && <ExtraFields fields={fields} values={extra} onChange={setExtra} />}
        </CardContent>
      </Card>

      {/* WHO */}
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>3. {t("intake.who")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 px-4">
          {cfg.liaisons.length > 0 && (
            <Field label={t("intake.liaison")} htmlFor="liaison">
              <Select id="liaison" value={liaisonId} onChange={(e) => pickLiaison(e.target.value)}>
                <option value="">{t("intake.pickLiaison")}</option>
                {cfg.liaisons.map((l) => {
                  const d = cfg.departments.find((x) => x.id === l.departmentId);
                  return (
                    <option key={l.id} value={l.id}>
                      {l.name} · {d ? label(d) : ""}
                    </option>
                  );
                })}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("intake.callerName")} htmlFor="callerName" required={!selfAssign && !backEntry}>
              <Input id="callerName" value={callerName} onChange={(e) => setCallerName(e.target.value)} />
            </Field>
            <Field label={t("intake.callerMobile")} htmlFor="callerMobile">
              <Input id="callerMobile" inputMode="tel" value={callerMobile} onChange={(e) => setCallerMobile(e.target.value)} />
            </Field>
          </div>
          {cfg.departments.length > 0 && (
            <Field label={t("intake.department")} htmlFor="department">
              <Select id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">—</option>
                {cfg.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {label(d)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid gap-2">
            <span className="text-sm font-medium">{t("intake.contact")}</span>
            <Checkbox checked={sameAsCaller} onChange={(e) => setSameAsCaller(e.target.checked)} label={t("intake.sameAsCaller")} />
            {!sameAsCaller && (
              <div className="grid grid-cols-2 gap-3">
                <Input aria-label={t("intake.contactName")} placeholder={t("intake.contactName")} value={contactName} onChange={(e) => setContactName(e.target.value)} />
                <Input aria-label={t("intake.contactMobile")} placeholder={t("intake.contactMobile")} inputMode="tel" value={contactMobile} onChange={(e) => setContactMobile(e.target.value)} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* OPTIONS + SUBMIT */}
      <Card className="gap-3 py-4">
        <CardContent className="grid gap-3 px-4">
          {!cfg.settings.drillMode && <Checkbox checked={isDrill} onChange={(e) => setIsDrill(e.target.checked)} label={t("intake.isDrill")} />}
          {user?.teamId && (zoneScoped || !canBackEntry) && <Checkbox checked={selfAssign} onChange={(e) => setSelfAssign(e.target.checked)} label={t("intake.selfAssign")} />}
          {canBackEntry && <Checkbox checked={backEntry} onChange={(e) => setBackEntry(e.target.checked)} label={t("intake.backEntry")} />}
          {backEntry && (
            <div className="bg-muted/40 grid gap-3 rounded-md border p-3 sm:grid-cols-2">
              <Field label={t("intake.requestedAt")} htmlFor="be-req" required>
                <Input id="be-req" type="datetime-local" value={be.requestedAt} onChange={(e) => setBe({ ...be, requestedAt: e.target.value })} />
              </Field>
              <Field label={t("intake.team")} htmlFor="be-team">
                <Select id="be-team" value={be.teamId} onChange={(e) => setBe({ ...be, teamId: e.target.value })}>
                  <option value="">—</option>
                  {cfg.teams.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.code}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("intake.dispatchedAt")} htmlFor="be-disp">
                <Input id="be-disp" type="datetime-local" value={be.dispatchedAt} onChange={(e) => setBe({ ...be, dispatchedAt: e.target.value })} />
              </Field>
              <Field label={t("intake.arrivedAt")} htmlFor="be-arr">
                <Input id="be-arr" type="datetime-local" value={be.arrivedAt} onChange={(e) => setBe({ ...be, arrivedAt: e.target.value })} />
              </Field>
              <Field label={t("intake.resolvedAt")} htmlFor="be-res">
                <Input id="be-res" type="datetime-local" value={be.resolvedAt} onChange={(e) => setBe({ ...be, resolvedAt: e.target.value })} />
              </Field>
              <Field label={t("intake.actionTaken")} htmlFor="be-action">
                <Textarea id="be-action" className="min-h-10" value={be.actionTaken} onChange={(e) => setBe({ ...be, actionTaken: e.target.value })} />
              </Field>
              <Checkbox checked={be.close} onChange={(e) => setBe({ ...be, close: e.target.checked })} label={t("intake.closeNow")} />
            </div>
          )}
          {error && (
            <p role="alert" className="text-destructive text-sm font-medium">
              {error}
            </p>
          )}
          <Button type="submit" size="xl" disabled={busy} data-testid="intake-submit">
            {busy ? <Loader2 className="animate-spin" /> : <Send />}
            {t("intake.submit")}
          </Button>
          <p className="text-muted-foreground text-center text-xs">Ctrl + Enter</p>
        </CardContent>
      </Card>
    </form>
  );
}

function NewRequest() {
  const { t } = useI18n();
  const lookups = useLookups();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("intake.title")} />
      {lookups.isLoading ? <Loading /> : lookups.error ? <ErrorState error={lookups.error} onRetry={() => lookups.refetch()} /> : <IntakeForm cfg={lookups.data!} />}
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <React.Suspense fallback={<Loading />}>
      <NewRequest />
    </React.Suspense>
  );
}
