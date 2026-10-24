"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LocaleSwitch, useCopy } from "@/components/locale";

export const AILABS_URL = "https://www.ailabs.sv/";

export function Lockup({ tone = "light" }: { tone?: "light" | "ink" }) {
  const ink = tone === "ink";
  return (
    <Link
      href="/"
      aria-label="Unísono · Ai Labs"
      className="inline-flex items-center gap-3 rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Image
        src={ink ? "/brand/ailabs-light.svg" : "/brand/ailabs-dark.svg"}
        alt="Ai Labs"
        width={1295}
        height={324}
        priority
        className="h-7 w-auto"
      />
      <span className={`h-6 w-px ${ink ? "bg-on-dark/20" : "bg-border"}`} aria-hidden />
      <span className="font-display text-xl leading-none">Unísono</span>
    </Link>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex w-fit items-center text-xs font-semibold tracking-wider text-muted-foreground uppercase ${className}`}>
      {children}
    </span>
  );
}

const navLink =
  "min-h-11 shrink-0 items-center whitespace-nowrap rounded-sm px-1 text-sm font-medium text-on-dark/80 transition-colors duration-150 hover:text-on-dark focus-visible:ring-2 focus-visible:ring-on-dark/50 focus-visible:outline-none";

export function SiteNav() {
  const { copy } = useCopy();
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-fit px-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/12 bg-surface-ink/85 px-3 py-1.5 text-on-dark shadow-soft backdrop-blur-md supports-backdrop-filter:bg-surface-ink/70 sm:gap-4 lg:pl-5">
          <nav className="flex items-center gap-4 sm:gap-6" aria-label={copy.nav.aria}>
            <Link href="/#abrir" className={`${navLink} inline-flex`}>
              {copy.nav.open}
            </Link>
            <Link href="/#unirme" className={`${navLink} inline-flex`}>
              {copy.nav.join}
            </Link>
            <a href={AILABS_URL} target="_blank" rel="noopener noreferrer" className={`${navLink} hidden text-on-dark sm:inline-flex`}>
              {copy.nav.talk}
            </a>
          </nav>
          <div className="h-5 w-px shrink-0 bg-on-dark/15" aria-hidden />
          <LocaleSwitch />
        </div>
      </div>
    </header>
  );
}

export function PoweredBy({ className = "" }: { className?: string }) {
  const { copy } = useCopy();
  return (
    <a
      href={AILABS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center gap-2.5 rounded-sm text-sm text-on-dark/65 transition-colors hover:text-on-dark focus-visible:ring-2 focus-visible:ring-on-dark/40 focus-visible:outline-none ${className}`}
    >
      {copy.footer.powered}
      <Image src="/brand/ailabs-light.svg" alt="Ai Labs" width={1295} height={324} className="h-5 w-auto" />
    </a>
  );
}

const footerLink =
  "inline-flex min-h-11 items-center rounded-sm text-sm text-on-dark/65 underline-offset-4 transition-colors hover:text-on-dark hover:underline focus-visible:ring-2 focus-visible:ring-on-dark/40 focus-visible:outline-none";

export function SiteFooter() {
  const { copy } = useCopy();
  const text = copy.footer;
  return (
    <footer className="relative overflow-hidden bg-graphite text-on-dark">
      <p
        aria-hidden
        className="font-display pointer-events-none absolute inset-x-0 bottom-6 text-center text-[clamp(4.5rem,18vw,12rem)] leading-none text-on-dark/[0.035] lowercase select-none sm:bottom-8"
      >
        get curious
      </p>
      <div className="page-gutter section-y relative mx-auto max-w-content pb-16 sm:pb-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col items-start gap-6 lg:col-span-5">
            <Lockup tone="ink" />
            <p className="max-w-sm text-sm leading-relaxed text-on-dark/65 md:text-[0.9375rem]">{text.about}</p>
            <PoweredBy />
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:col-span-7 lg:grid-cols-3">
            <div>
              <h2 className="text-sm font-semibold text-on-dark">{text.product}</h2>
              <ul className="mt-3.5 flex flex-col gap-0.5">
                <li>
                  <Link href="/#abrir" className={footerLink}>
                    {copy.nav.open}
                  </Link>
                </li>
                <li>
                  <Link href="/#unirme" className={footerLink}>
                    {copy.nav.join}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-on-dark">{text.company}</h2>
              <ul className="mt-3.5 flex flex-col gap-0.5">
                <li>
                  <a href={AILABS_URL} target="_blank" rel="noopener noreferrer" className={footerLink}>
                    {text.site}
                  </a>
                </li>
                <li>
                  <a href={`${AILABS_URL}#services`} target="_blank" rel="noopener noreferrer" className={footerLink}>
                    {text.services}
                  </a>
                </li>
                <li>
                  <a href={`${AILABS_URL}community`} target="_blank" rel="noopener noreferrer" className={footerLink}>
                    {text.community}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-on-dark/12 pt-6">
          <p className="text-sm text-on-dark/55">
            © 2026{" "}
            <a href={AILABS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-on-dark">
              Ai Labs
            </a>
          </p>
          <p className="text-sm text-on-dark/55">{text.made}</p>
        </div>
      </div>
    </footer>
  );
}
