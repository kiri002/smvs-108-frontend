"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { navItems } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user, can, logout } = useAuth();
  const { t } = useI18n();
  const { setOpenMobile } = useSidebar();
  if (!user) return null;

  const items = navItems.filter((item) => item.visible(can, user));
  // Longest matching URL wins, so /requests/new does not also highlight /requests.
  const active = items
    .filter((i) => pathname === i.url || pathname.startsWith(i.url + "/"))
    .sort((a, b) => b.url.length - a.url.length)[0]?.url;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={user.homeScreen || "/control-room"} onClick={() => setOpenMobile(false)}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-red-700 text-xs font-bold text-white">108</div>
                <div className="grid leading-tight">
                  <span className="truncate font-semibold">{siteConfig.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{t("app.tagline")}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-1">
            {items.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild tooltip={t(item.titleKey)} isActive={active === item.url}>
                  <Link href={item.url} onClick={() => setOpenMobile(false)}>
                    <item.icon />
                    <span>{t(item.titleKey)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("nav.profile")} isActive={pathname === "/profile"}>
              <Link href="/profile" onClick={() => setOpenMobile(false)}>
                <UserRound />
                <span className="grid leading-tight">
                  <span className="truncate">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.roleLabel}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={t("nav.logout")} onClick={logout}>
              <LogOut />
              <span>{t("nav.logout")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
