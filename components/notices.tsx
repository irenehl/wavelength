"use client";

import Link from "next/link";
import { LocaleSwitch, useCopy } from "@/components/locale";

function Kicker() {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm tracking-[0.18em] text-primary uppercase">Puente</p>
      <LocaleSwitch />
    </div>
  );
}

export function KeyBanner() {
  const { copy } = useCopy();
  const [before, after = ""] = copy.notices.key.split("OPENAI_API_KEY");
  return (
    <p role="status" className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm leading-6">
      {before}
      <span className="font-medium">OPENAI_API_KEY</span>
      {after}
    </p>
  );
}

export function MissingEvent({ code }: { code: string }) {
  const { copy } = useCopy();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6">
      <Kicker />
      <h1 className="font-display mt-3 text-4xl leading-tight">{copy.notices.missingTitle}</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        {code ? <span className="text-foreground">{copy.notices.looked(code)} </span> : null}
        {copy.notices.missingBody}
      </p>
      <Link href="/" className="mt-6 text-sm underline underline-offset-4">
        {copy.notices.back}
      </Link>
    </main>
  );
}

export function LoadingEvent() {
  const { copy } = useCopy();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6">
      <Kicker />
      <h1 className="font-display mt-3 text-4xl">{copy.notices.loading}</h1>
    </main>
  );
}

export function ServerError() {
  const { copy } = useCopy();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6">
      <Kicker />
      <h1 className="font-display mt-3 text-4xl">{copy.notices.serverTitle}</h1>
      <p className="mt-4 leading-7 text-muted-foreground">{copy.notices.serverBody}</p>
    </main>
  );
}
