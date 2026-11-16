"use client";

import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { API_BASE_URL, tokenStore } from "./api";
import { useAuth } from "./auth";

// Which cached queries each server topic invalidates.
const TOPIC_KEYS: Record<string, string[]> = {
  requests: ["board", "request", "suggestions", "my", "requests", "releases"],
  teams: ["teamBoard", "suggestions", "my"],
  reserve: ["teamBoard", "releases"],
  config: ["lookups", "config", "events", "setup"],
  alerts: ["alerts"],
};

type Status = "connecting" | "live" | "offline";
const RealtimeContext = React.createContext<Status>("connecting");

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = React.useState<Status>("connecting");

  React.useEffect(() => {
    const token = tokenStore.get();
    if (!user || !token) return;
    let source: EventSource | null = null;
    let retry: number | undefined;
    let closed = false;

    const connect = () => {
      source = new EventSource(`${API_BASE_URL}/stream?token=${encodeURIComponent(token)}`);
      source.onopen = () => setStatus("live");
      source.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { topics: string[] };
          const keys = new Set(msg.topics.flatMap((t) => TOPIC_KEYS[t] ?? []));
          keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
        } catch {
          // ignore malformed message
        }
      };
      source.onerror = () => {
        setStatus("offline");
        source?.close();
        if (!closed) retry = window.setTimeout(connect, 5000);
      };
    };
    connect();
    return () => {
      closed = true;
      window.clearTimeout(retry);
      source?.close();
    };
  }, [user, qc]);

  return <RealtimeContext.Provider value={status}>{children}</RealtimeContext.Provider>;
}

export const useRealtimeStatus = () => React.useContext(RealtimeContext);
