"use client";

import { MapPin, X } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import type { Location, Zone } from "@/lib/types";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_/.]/g, "");

/** Type-ahead over configured locations; "gate 3", "Gate-3" and "gate3" all match. */
export function LocationPicker({
  locations,
  zones,
  value,
  onChange,
  autoFocus,
}: {
  locations: Location[];
  zones: Zone[];
  value: number | null;
  onChange: (id: number | null) => void;
  autoFocus?: boolean;
}) {
  const { t, label } = useI18n();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);
  const selected = locations.find((l) => l.id === value) ?? null;
  const zoneOf = (l: Location) => zones.find((z) => z.id === l.zoneId);

  const matches = React.useMemo(() => {
    const n = norm(q);
    if (!n) return locations.slice(0, 8);
    return locations
      .filter((l) => [l.labelEn, l.labelGu, l.code, l.landmark].some((s) => s && norm(s).includes(n)))
      .sort((a, b) => Number(!norm(a.labelEn).startsWith(n)) - Number(!norm(b.labelEn).startsWith(n)))
      .slice(0, 8);
  }, [q, locations]);

  if (selected) {
    const z = zoneOf(selected);
    return (
      <div className="bg-accent/40 flex items-center gap-2 rounded-md border px-3 py-2" data-testid="location-selected">
        <MapPin className="size-4" />
        <span className="font-semibold">{label(selected)}</span>
        {z && (
          <span className="rounded px-1.5 text-xs font-semibold text-white" style={{ backgroundColor: z.color }}>
            {z.code}
          </span>
        )}
        <button type="button" className="text-muted-foreground hover:text-foreground ml-auto" onClick={() => onChange(null)} aria-label="Clear location">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const choose = (l: Location) => {
    onChange(l.id);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        id="location"
        value={q}
        autoFocus={autoFocus}
        placeholder={t("intake.searchLocation")}
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setCursor(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          } else if (e.key === "Enter" && open && matches[cursor]) {
            e.preventDefault();
            choose(matches[cursor]);
          }
        }}
        className="h-11 text-base"
        role="combobox"
        aria-expanded={open}
        aria-controls="location-list"
      />
      {open && matches.length > 0 && (
        <ul id="location-list" role="listbox" className="bg-popover absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border shadow-md">
          {matches.map((l, i) => {
            const z = zoneOf(l);
            return (
              <li key={l.id} role="option" aria-selected={i === cursor}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(l)}
                  className={cn("hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm", i === cursor && "bg-accent")}
                >
                  <MapPin className="text-muted-foreground size-3.5" />
                  <span className="flex-1">{label(l)}</span>
                  {z && (
                    <span className="rounded px-1.5 text-xs font-semibold text-white" style={{ backgroundColor: z.color }}>
                      {z.code}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
