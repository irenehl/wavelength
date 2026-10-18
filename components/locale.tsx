"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { copyFor, type UiLocale } from "@/lib/copy";

const STORAGE_KEY = "puente-locale";
const CHANGE = "puente-locale-change";
let memoryLocale: UiLocale | null = null;

function readLocale(): UiLocale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") return saved;
    if (memoryLocale) return memoryLocale;
    return navigator.language.toLowerCase().startsWith("en") ? "en" : "es";
  } catch {
    if (memoryLocale) return memoryLocale;
    return navigator.language.toLowerCase().startsWith("en") ? "en" : "es";
  }
}

function serverLocale(): UiLocale {
  return "es";
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function publish(locale: UiLocale) {
  memoryLocale = locale;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // The in-memory choice still updates this tab.
  }
  window.dispatchEvent(new Event(CHANGE));
}

const LocaleContext = createContext<{
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
} | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, serverLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <LocaleContext.Provider value={{ locale, setLocale: publish }}>{children}</LocaleContext.Provider>;
}

export function useCopy() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("LocaleProvider missing");
  return { locale: value.locale, setLocale: value.setLocale, copy: copyFor(value.locale) };
}

export function LocaleSwitch({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  const { locale, setLocale, copy } = useCopy();
  const paper = tone === "paper";

  return (
    <div
      role="group"
      aria-label={copy.switchAria}
      className={`inline-flex rounded-full border p-0.5 text-xs ${
        paper ? "border-[#1c1712]/25" : "border-border"
      }`}
    >
      {(["es", "en"] as const).map((item) => {
        const active = locale === item;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(item)}
            className={`rounded-full px-2.5 py-1 tracking-wide uppercase ${
              active
                ? paper
                  ? "bg-[#1c1712] text-[#f3ecdf]"
                  : "bg-primary text-primary-foreground"
                : paper
                  ? "text-[#1c1712]/70"
                  : "text-muted-foreground"
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
