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

export function LocaleSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale, copy } = useCopy();
  const next: UiLocale = locale === "es" ? "en" : "es";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={copy.switchTo}
      title={copy.switchTo}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-xs font-semibold tracking-wider text-on-dark uppercase transition-colors hover:bg-on-dark/10 focus-visible:ring-2 focus-visible:ring-on-dark/50 focus-visible:outline-none ${className}`}
    >
      {next}
    </button>
  );
}
