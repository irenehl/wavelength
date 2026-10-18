"use client";

import Link from "next/link";
import { LocaleSwitch, useCopy } from "@/components/locale";

export default function NotFound() {
  const { copy } = useCopy();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm tracking-[0.18em] text-primary uppercase">Puente</p>
        <LocaleSwitch />
      </div>
      <h1 className="font-display mt-3 text-4xl">{copy.notices.notFound}</h1>
      <Link href="/" className="mt-6 text-sm underline underline-offset-4">
        {copy.notices.back}
      </Link>
    </main>
  );
}
