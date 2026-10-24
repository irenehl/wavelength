"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandBar } from "@/components/brand";
import { LocaleSwitch, useCopy } from "@/components/locale";
import { buttonVariants } from "@/components/ui/button";

export function NoticePage({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-8 sm:px-8">
      <BrandBar>
        <LocaleSwitch />
      </BrandBar>
      <div className="my-auto max-w-lg py-16">{children}</div>
    </main>
  );
}

export function BackHome() {
  const { copy } = useCopy();
  return (
    <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-8 h-11 px-5" })}>
      {copy.notices.back}
    </Link>
  );
}

export function KeyBanner() {
  const { copy } = useCopy();
  const [before, after = ""] = copy.notices.key.split("OPENAI_API_KEY");
  return (
    <p role="status" className="rounded-xl border border-primary/50 bg-lavender px-4 py-3 text-sm leading-6">
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
      <h1 className="font-display text-4xl leading-tight">{copy.notices.missingTitle}</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
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
      <h1 className="font-display animate-pulse text-4xl">{copy.notices.loading}</h1>
    </NoticePage>
  );
}

export function ServerError() {
  const { copy } = useCopy();
  return (
    <NoticePage>
      <h1 className="font-display text-4xl">{copy.notices.serverTitle}</h1>
      <p className="mt-4 leading-7 text-muted-foreground">{copy.notices.serverBody}</p>
    </NoticePage>
  );
}
