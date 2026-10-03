"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, LogOut, Pencil, Plus, Power } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/common/action-dialog";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox, Field, Select } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { errorMessage, get, patch, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLookups } from "@/lib/queries";

type UserRow = {
  id: number;
  name: string;
  mobile: string;
  email: string;
  roleId: number;
  teamId: number | null;
  zoneId: number | null;
  language: string;
  active: boolean;
  role: { code: string; labelEn: string };
  team: { code: string } | null;
  zone: { code: string } | null;
};

type Form = { name: string; mobile: string; email: string; pin: string; roleId: string; teamId: string; zoneId: string; language: string };
const empty: Form = { name: "", mobile: "", email: "", pin: "", roleId: "", teamId: "", zoneId: "", language: "en" };

export default function UsersPage() {
  const { can, user: me } = useAuth();
  const qc = useQueryClient();
  const lookups = useLookups();
  const [inactive, setInactive] = React.useState(false);
  const [q, setQ] = React.useState("");
  const users = useQuery({ queryKey: ["users", "admin", inactive], queryFn: () => get<UserRow[]>("/users", { includeInactive: inactive ? 1 : undefined }) });
  const roles = useQuery({ queryKey: ["config", "roles", "all"], queryFn: () => get<{ id: number; code: string; labelEn: string; active: boolean }[]>("/config/roles") });
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<Form>(empty);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pinFor, setPinFor] = React.useState<UserRow | null>(null);
  const canEdit = !!can("USERS", "CONFIGURE");
  const refresh = () => ["users", "teamBoard", "lookups"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));

  const openForm = (u: UserRow | null) => {
    setEditing(u);
    setError(null);
    setForm(
      u
        ? { name: u.name, mobile: u.mobile, email: u.email, pin: "", roleId: String(u.roleId), teamId: u.teamId ? String(u.teamId) : "", zoneId: u.zoneId ? String(u.zoneId) : "", language: u.language }
        : empty,
    );
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { name: form.name, mobile: form.mobile, email: form.email, roleId: Number(form.roleId), teamId: form.teamId || null, zoneId: form.zoneId || null, language: form.language };
      if (editing) await patch(`/users/${editing.id}`, body);
      else await post("/users", { ...body, pin: form.pin });
      toast.success("Saved");
      refresh();
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const act = (p: Promise<unknown>, msg: string) =>
    p
      .then(() => {
        toast.success(msg);
        refresh();
      })
      .catch((e) => toast.error(errorMessage(e)));

  const list = (users.data ?? []).filter((u) => !q || `${u.name} ${u.mobile} ${u.role.labelEn} ${u.team?.code ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Users"
        description="Everyone who signs in. Disable people instead of deleting them."
        actions={
          canEdit && (
            <Button onClick={() => openForm(null)} data-testid="user-add">
              <Plus /> Add user
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Input className="w-64" placeholder="Search name, mobile, role, team" value={q} onChange={(e) => setQ(e.target.value)} />
        <Checkbox checked={inactive} onChange={(e) => setInactive(e.target.checked)} label="Show disabled" />
      </div>
      {users.isLoading ? (
        <Loading />
      ) : users.error ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      ) : !list.length ? (
        <Empty>No users.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Mobile</th>
                <th className="p-2">Role</th>
                <th className="p-2">Team</th>
                <th className="p-2">Zone</th>
                <th className="p-2">Status</th>
                {canEdit && <th className="p-2" />}
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className={`border-t ${u.active ? "" : "opacity-50"}`}>
                  <td className="p-2 font-medium">{u.name}</td>
                  <td className="p-2 font-mono">{u.mobile}</td>
                  <td className="p-2">{u.role.labelEn}</td>
                  <td className="p-2 font-mono">{u.team?.code ?? "—"}</td>
                  <td className="p-2">{u.zone?.code ?? "—"}</td>
                  <td className="p-2">{u.active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Disabled</Badge>}</td>
                  {canEdit && (
                    <td className="p-2 whitespace-nowrap">
                      <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => openForm(u)}>
                        <Pencil />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Reset PIN" onClick={() => setPinFor(u)}>
                        <KeyRound />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Sign out everywhere" onClick={() => void act(post(`/users/${u.id}/revoke-sessions`), "Signed out")}>
                        <LogOut />
                      </Button>
                      {u.id !== me?.id && (
                        <Button size="icon-sm" variant="ghost" aria-label={u.active ? "Disable" : "Enable"} onClick={() => void act(post(`/users/${u.id}/${u.active ? "deactivate" : "activate"}`), u.active ? "Disabled" : "Enabled")}>
                          <Power className={u.active ? "text-destructive" : "text-emerald-600"} />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={save} className="grid gap-3">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${editing.name}` : "Add user"}</DialogTitle>
            </DialogHeader>
            <Field label="Name" htmlFor="u-name" required>
              <Input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mobile" htmlFor="u-mobile" required>
                <Input id="u-mobile" inputMode="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
              </Field>
              {!editing && (
                <Field label="PIN (4–8 digits)" htmlFor="u-pin" required>
                  <Input id="u-pin" inputMode="numeric" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} required pattern="\d{4,8}" />
                </Field>
              )}
              <Field label="Email" htmlFor="u-email">
                <Input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Role" htmlFor="u-role" required>
                <Select id="u-role" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} required>
                  <option value="">—</option>
                  {roles.data?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.labelEn}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Team" htmlFor="u-team">
                <Select id="u-team" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
                  <option value="">—</option>
                  {lookups.data?.teams.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.code}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Zone" htmlFor="u-zone" hint="Leave empty to use the team's zone">
                <Select id="u-zone" value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}>
                  <option value="">—</option>
                  {lookups.data?.zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.code} · {z.labelEn}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Language" htmlFor="u-lang">
                <Select id="u-lang" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="gu">ગુજરાતી</option>
                </Select>
              </Field>
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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

      <ActionDialog
        open={!!pinFor}
        onOpenChange={(o) => !o && setPinFor(null)}
        title={`Reset PIN · ${pinFor?.name ?? ""}`}
        description="The person is signed out everywhere and must use the new PIN."
        fields={[{ name: "pin", label: "New PIN (4–8 digits)", type: "text", required: true }]}
        confirmLabel="Reset PIN"
        onConfirm={async (v) => {
          await post(`/users/${pinFor!.id}/reset-pin`, { pin: v.pin });
          toast.success("PIN reset");
        }}
      />
    </div>
  );
}
