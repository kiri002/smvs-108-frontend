"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Select } from "@/components/ui/form";
import { useAdminEvent } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/config", label: "Configuration" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/permissions", label: "Permissions" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/audit", label: "Change history" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = useAuth();
  const { events, current, choose } = useAdminEvent();
  const canConfigure = !!can("CONFIG", "CONFIGURE");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 border-b pb-2">
        <nav className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", active ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
                {tab.label}
              </Link>
            );
          })}
        </nav>
        {canConfigure && events.data && (
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Editing event</span>
            <Select className="h-8 w-auto" value={current ? String(current.id) : ""} onChange={(e) => choose(e.target.value || null)} data-testid="admin-event">
              {events.data.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.status})
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>
      {current && current.status !== "LIVE" && canConfigure && (
        <div className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          You are editing <b>{current.name}</b> ({current.status}). Operations keep using the live event.
        </div>
      )}
      {children}
    </div>
  );
}
