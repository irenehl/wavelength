"use client";

import { LocaleSwitch, useCopy } from "@/components/locale";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { copy } = useCopy();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm tracking-[0.18em] text-primary uppercase">Puente</p>
        <LocaleSwitch />
      </div>
      <h1 className="font-display mt-3 text-4xl">{copy.notices.crashTitle}</h1>
      <p className="mt-3 text-muted-foreground">{copy.notices.crashBody}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-12 rounded-full bg-primary px-5 text-base font-medium text-primary-foreground"
      >
        {copy.notices.retry}
      </button>
    </main>
  );
}
