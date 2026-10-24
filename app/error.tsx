"use client";

import { useCopy } from "@/components/locale";
import { NoticePage } from "@/components/notices";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { copy } = useCopy();
  return (
    <NoticePage>
      <h1 className="font-display text-4xl leading-[1.05] text-balance sm:text-5xl">{copy.notices.crashTitle}</h1>
      <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">{copy.notices.crashBody}</p>
      <Button type="button" onClick={reset} className="brand-action mt-8 h-auto min-h-12 rounded-full px-5 text-sm">
        {copy.notices.retry}
      </Button>
    </NoticePage>
  );
}
