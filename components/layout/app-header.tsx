"use client";

import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { navItems } from "@/config/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const current = navItems.find(
    (item) => pathname === item.url || pathname.startsWith(item.url + "/"),
  );

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <span className="text-sm font-medium">{current?.title}</span>
    </header>
  );
}
