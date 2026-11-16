"use client";

import { CloudOff, Languages, Wifi } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { navItems } from "@/config/navigation";
import { post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useQueuedCount } from "@/lib/offline-queue";
import { useLookups } from "@/lib/queries";
import { useRealtimeStatus } from "@/lib/realtime";

import { AlertsBell } from "./alerts-sheet";

export function AppHeader() {
  const pathname = usePathname();
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  const lookups = useLookups();
  const live = useRealtimeStatus();
  const queued = useQueuedCount();

  const current = navItems
    .filter((i) => pathname === i.url || pathname.startsWith(i.url + "/"))
    .sort((a, b) => b.url.length - a.url.length)[0];

  const toggleLang = () => {
    const next = lang === "en" ? "gu" : "en";
    setLang(next);
    void post("/auth/language", { language: next }).catch(() => {});
  };

  return (
    <>
      <header className="bg-background/95 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur sm:px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
        <span className="truncate text-sm font-semibold">{current ? t(current.titleKey) : ""}</span>
        {lookups.data?.event && <span className="text-muted-foreground hidden truncate text-xs md:inline">· {lookups.data.event.name}</span>}
        <div className="ml-auto flex items-center gap-1">
          <span
            className="text-muted-foreground hidden items-center gap-1 text-xs sm:flex"
            title={live === "live" ? "Live updates connected" : "Live updates reconnecting; data refreshes every 15 s"}
          >
            {live === "live" ? <Wifi className="size-3.5 text-emerald-600" /> : <CloudOff className="size-3.5 text-amber-600" />}
          </span>
          <Button variant="ghost" size="sm" onClick={toggleLang} aria-label={t("common.language")}>
            <Languages />
            <span className="text-xs">{lang === "en" ? "ગુજ" : "EN"}</span>
          </Button>
          <AlertsBell enabled={!!user} />
        </div>
      </header>
      {lookups.data?.settings.drillMode && (
        <div className="bg-amber-400 px-4 py-1.5 text-center text-sm font-semibold text-amber-950">{t("board.drillMode")}</div>
      )}
      {queued > 0 && (
        <div className="bg-sky-100 px-4 py-1.5 text-center text-sm text-sky-900 dark:bg-sky-900/40 dark:text-sky-100">
          {t("common.offline")} {t("common.queued", { n: queued })}
        </div>
      )}
    </>
  );
}
