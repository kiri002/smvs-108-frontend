"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Loading({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("text-muted-foreground flex items-center gap-2 p-6 text-sm", className)}>
      <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm">
      <AlertTriangle className="text-destructive size-4" />
      <span className="flex-1">{errorMessage(error)}</span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
