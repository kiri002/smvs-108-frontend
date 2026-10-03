"use client";

import { useQuery } from "@tanstack/react-query";

import { get } from "./api";
import { syncServerTime } from "./time";
import type { Alert, Board, Lookups, MyAssignments, RequestDetail, ReserveRelease, SuggestionPlan, TeamBoard } from "./types";

// Live data refreshes on server push; this interval is the fallback if the stream drops.
const LIVE = 15_000;

export const useLookups = () =>
  useQuery({ queryKey: ["lookups"], queryFn: () => get<Lookups>("/lookups"), staleTime: 60_000 });

export const useBoard = (recent = false, enabled = true) =>
  useQuery({
    queryKey: ["board", recent],
    queryFn: async () => {
      const b = await get<Board>("/requests/board", { recent: recent ? 1 : undefined });
      syncServerTime(b.serverNow);
      return b;
    },
    refetchInterval: LIVE,
    enabled,
  });

export const useTeamBoard = (enabled = true) =>
  useQuery({
    queryKey: ["teamBoard"],
    queryFn: async () => {
      const b = await get<TeamBoard>("/teams/board");
      syncServerTime(b.serverNow);
      return b;
    },
    refetchInterval: LIVE,
    enabled,
  });

export const useRequest = (id: number) =>
  useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const r = await get<RequestDetail>(`/requests/${id}`);
      syncServerTime(r.serverNow);
      return r;
    },
    refetchInterval: LIVE,
    enabled: Number.isFinite(id) && id > 0,
  });

export const useSuggestions = (id: number, enabled: boolean) =>
  useQuery({ queryKey: ["suggestions", id], queryFn: () => get<SuggestionPlan>(`/requests/${id}/suggestions`), enabled });

export const useMyAssignments = (enabled = true) =>
  useQuery({
    queryKey: ["my"],
    queryFn: async () => {
      const r = await get<MyAssignments>("/my/assignments");
      syncServerTime(r.serverNow);
      return r;
    },
    refetchInterval: LIVE,
    enabled,
  });

export const useMyAttendance = () =>
  useQuery({
    queryKey: ["myAttendance"],
    queryFn: () => get<{ id: number; checkInAt: string; team: { id: number; code: string } } | null>("/teams/attendance/me"),
  });

export const useAlerts = (enabled = true) =>
  useQuery({ queryKey: ["alerts"], queryFn: () => get<{ items: Alert[]; unread: number }>("/alerts"), refetchInterval: 30_000, enabled });

export const useReleases = (pending: boolean, enabled = true) =>
  useQuery({ queryKey: ["releases", pending], queryFn: () => get<ReserveRelease[]>("/reserve-releases", { pending: pending ? 1 : undefined }), enabled, refetchInterval: LIVE });
