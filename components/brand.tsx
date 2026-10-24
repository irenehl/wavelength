import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export const AILABS_URL = "https://www.ailabs.sv/";

export function BrandMark({ tone = "light" }: { tone?: "light" | "ink" }) {
  const ink = tone === "ink";
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="Puente · Ai Labs">
      <Image
        src={ink ? "/brand/ailabs-light.svg" : "/brand/ailabs-dark.svg"}
        alt="Ai Labs"
        width={1295}
        height={324}
        priority
        className="h-6 w-auto sm:h-7"
      />
      <span className={`h-5 w-px ${ink ? "bg-white/20" : "bg-border"}`} aria-hidden />
      <span className="font-display text-lg leading-none">Puente</span>
    </Link>
  );
}

export function BrandBar({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <BrandMark />
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-xs font-semibold tracking-wider text-muted-foreground uppercase ${className}`}>{children}</p>
  );
}

export function PoweredBy({ tone = "light" }: { tone?: "light" | "ink" }) {
  const ink = tone === "ink";
  return (
    <a
      href={AILABS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-2 text-sm ${ink ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
    >
      <span>Powered by</span>
      <Image
        src={ink ? "/brand/ailabs-light.svg" : "/brand/ailabs-dark.svg"}
        alt="Ai Labs"
        width={1295}
        height={324}
        className="h-4 w-auto"
      />
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:px-8">
        <PoweredBy />
        <a
          href={AILABS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground"
        >
          ailabs.sv · El Salvador
        </a>
      </div>
    </footer>
  );
}
