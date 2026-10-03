"use client";

import * as React from "react";

import { en, gu, type MessageKey } from "./dictionary";

export type Lang = "en" | "gu";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  /** Picks the Gujarati label when the language is Gujarati and one exists. */
  label: (row: { labelEn?: string; labelGu?: string } | null | undefined) => string;
};

const I18nContext = React.createContext<Ctx | null>(null);
const KEY = "smvs108.lang";

function fill(text: string, params?: Record<string, string | number>) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("en");

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "gu" || saved === "en") setLangState(saved);
    } catch {
      // ignore
    }
  }, []);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(KEY, l);
    } catch {
      // ignore
    }
    document.documentElement.lang = l;
  }, []);

  const value = React.useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key, params) => fill((lang === "gu" && gu[key]) || en[key] || key, params),
      label: (row) => (row ? (lang === "gu" && row.labelGu) || row.labelEn || "" : ""),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export type { MessageKey };
