"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { adminEventStore, get } from "./api";

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "longtext" | "int" | "float" | "bool" | "color" | "time" | "enum" | "ref" | "list";
  required?: boolean;
  ref?: string;
  enumValues?: string[];
  default?: string | number | boolean | null;
  help?: string;
  list?: boolean;
  immutable?: boolean;
};

export type EntityDef = {
  key: string;
  label: string;
  group: string;
  description: string;
  eventScoped: boolean;
  uniqueBy: string[];
  display: string;
  hasActive: boolean;
  hasSort: boolean;
  singleton?: boolean;
  fields: FieldDef[];
};

export type EventRow = { id: number; code: string; name: string; startDate: string; endDate: string; timezone: string; status: "DRAFT" | "LIVE" | "CLOSED" };

export const useConfigMeta = () => useQuery({ queryKey: ["config", "meta"], queryFn: () => get<EntityDef[]>("/config/meta"), staleTime: Infinity });

export const useEvents = () => useQuery({ queryKey: ["events"], queryFn: () => get<EventRow[]>("/events") });

/** The event the admin is editing (a draft or the live one). Stored per browser. */
export function useAdminEvent() {
  const events = useEvents();
  const [selected, setSelected] = React.useState<string | null>(null);
  React.useEffect(() => setSelected(adminEventStore.get()), []);
  const live = events.data?.find((e) => e.status === "LIVE");
  const current = events.data?.find((e) => String(e.id) === selected) ?? live ?? events.data?.[0] ?? null;
  const choose = (id: string | null) => {
    adminEventStore.set(id);
    setSelected(id);
  };
  return { events, current, live, choose };
}

export type Row = Record<string, unknown> & { id: number; active?: boolean };

export const useConfigRows = (key: string, eventId: number | undefined, includeInactive: boolean) =>
  useQuery({
    queryKey: ["config", key, eventId, includeInactive],
    queryFn: () => get<Row[]>(`/config/${key}`, { includeInactive: includeInactive ? 1 : undefined }),
    enabled: !!key && eventId !== undefined,
  });
