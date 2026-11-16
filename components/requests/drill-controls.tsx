"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { errorMessage, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLookups } from "@/lib/queries";

/** Drill mode on/off and "remove drill requests" — run by the Control Room (AUDIT CREATE). */
export function DrillControls() {
  const { t } = useI18n();
  const { can } = useAuth();
  const qc = useQueryClient();
  const lookups = useLookups();
  if (!can("AUDIT", "CREATE")) return null;
  const drill = lookups.data?.settings.drillMode ?? false;

  const setDrill = async (enabled: boolean) => {
    try {
      await post("/events/live/drill-mode", { enabled });
      toast.success(enabled ? t("drill.onToast") : t("drill.offToast"));
      void qc.invalidateQueries({ queryKey: ["lookups"] });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const clearDrills = async () => {
    if (!window.confirm(t("drill.confirmClear"))) return;
    try {
      const r = await post<{ removed: number }>("/events/live/clear-drills");
      toast.success(t("drill.removed", { n: r.removed }));
      ["board", "requests", "report", "teamBoard"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant={drill ? "default" : "outline"} onClick={() => void setDrill(!drill)} data-testid="drill-toggle" title={t("drill.help")}>
        <FlaskConical /> {drill ? t("drill.turnOff") : t("drill.turnOn")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => void clearDrills()} data-testid="drill-clear">
        {t("drill.clear")}
      </Button>
    </div>
  );
}
