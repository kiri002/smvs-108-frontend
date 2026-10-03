"use client";

import Link from "next/link";

import { Loading, PageHeader } from "@/components/common/states";
import { useConfigMeta } from "@/lib/admin";

export default function ConfigIndexPage() {
  const meta = useConfigMeta();
  if (meta.isLoading) return <Loading />;
  const groups = (meta.data ?? []).reduce<Record<string, NonNullable<typeof meta.data>>>((acc, e) => {
    (acc[e.group] ??= []).push(e);
    return acc;
  }, {});
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Configuration" description="Everything here can be added, renamed and switched off without a developer." />
      {Object.entries(groups).map(([group, items]) => (
        <section key={group} className="grid gap-2">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase">{group}</h2>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((e) => (
              <Link key={e.key} href={`/admin/config/${e.key}`} className="hover:bg-accent/50 rounded-lg border p-3">
                <div className="font-semibold">{e.label}</div>
                <div className="text-muted-foreground text-sm">{e.description}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
