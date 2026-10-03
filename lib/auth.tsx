"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";

import { get, post, setUnauthorizedHandler, tokenStore } from "./api";
import { useI18n } from "./i18n";
import type { Me } from "./types";

type Scope = "ALL" | "ZONE" | "TEAM" | "OWN";

type AuthCtx = {
  user: Me | null;
  ready: boolean;
  login: (mobile: string, pin: string) => Promise<Me>;
  logout: () => void;
  refresh: () => Promise<void>;
  /** Widest scope the user has for module + action (CONFIGURE grants everything), or null. */
  can: (module: string, action: string) => Scope | null;
};

const AuthContext = React.createContext<AuthCtx | null>(null);
const RANK: Record<Scope, number> = { OWN: 0, TEAM: 1, ZONE: 2, ALL: 3 };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<Me | null>(null);
  const [ready, setReady] = React.useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  const { setLang } = useI18n();

  const logout = React.useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    qc.clear();
    router.replace("/login");
  }, [qc, router]);

  const refresh = React.useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      return;
    }
    try {
      setUser(await get<Me>("/auth/me"));
    } catch {
      tokenStore.set(null);
      setUser(null);
    }
  }, []);

  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      if (tokenStore.get()) logout();
    });
    refresh().finally(() => setReady(true));
  }, [logout, refresh]);

  const login = React.useCallback(
    async (mobile: string, pin: string) => {
      const res = await post<{ token: string; user: Me }>("/auth/login", { mobile, pin });
      tokenStore.set(res.token);
      setUser(res.user);
      if (res.user.language === "gu" || res.user.language === "en") setLang(res.user.language);
      return res.user;
    },
    [setLang],
  );

  const can = React.useCallback(
    (module: string, action: string): Scope | null => {
      if (!user) return null;
      let best: Scope | null = null;
      for (const p of user.permissions) {
        if (p.module !== module) continue;
        const s = p.action === "CONFIGURE" ? "ALL" : p.action === action ? p.scope : null;
        if (s && (!best || RANK[s] > RANK[best])) best = s;
      }
      return best;
    },
    [user],
  );

  const value = React.useMemo(() => ({ user, ready, login, logout, refresh, can }), [user, ready, login, logout, refresh, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
