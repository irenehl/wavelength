"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Lockup } from "@/components/brand";
import { useCopy } from "@/components/locale";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NoticePage({ children }: { children: ReactNode }) {
  return (
    <main className="page-gutter pt-header mx-auto flex w-full max-w-content flex-1 flex-col pb-12">
      <div>
        <Lockup />
      </div>
      <div className="my-auto max-w-xl py-20">{children}</div>
    </main>
  );
}

export function BackHome() {
  const { copy } = useCopy();
  return (
    <Link
      href="/"
      className={cn(buttonVariants({ variant: "outline" }), "brand-action mt-8 h-auto min-h-12 gap-1.5 rounded-full px-5 text-sm hover:bg-input/50")}
    >
      <ChevronLeft />
      {copy.notices.back}
    </Link>
  );
}

export function KeyBanner() {
  const { copy } = useCopy();
  const [before, after = ""] = copy.notices.key.split("OPENAI_API_KEY");
  return (
    <p role="status" className="rounded-2xl border border-purple/40 bg-purple/10 px-4 py-3 text-sm leading-6">
      {before}
      <span className="font-medium">OPENAI_API_KEY</span>
      {after}
    </p>
  );
}

export function MissingEvent({ code }: { code: string }) {
  const { copy } = useCopy();
  return (
    <NoticePage>
      <h1 className="font-display text-4xl leading-[1.05] text-balance sm:text-5xl">{copy.notices.missingTitle}</h1>
      <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
        {code ? <span className="text-foreground">{copy.notices.looked(code)} </span> : null}
        {copy.notices.missingBody}
      </p>
      <BackHome />
    </NoticePage>
  );
}

export function LoadingEvent() {
  const { copy } = useCopy();
  return (
    <NoticePage>
      <h1 className="font-display animate-pulse text-4xl leading-[1.05] sm:text-5xl">{copy.notices.loading}</h1>
    </NoticePage>
  );
}

export function ServerError() {
  const { copy } = useCopy();
  return (
    <NoticePage>
      <h1 className="font-display text-4xl leading-[1.05] text-balance sm:text-5xl">{copy.notices.serverTitle}</h1>
      <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">{copy.notices.serverBody}</p>
    </NoticePage>
  );
}
