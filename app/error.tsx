"use client";

import { useCopy } from "@/components/locale";
import { NoticePage } from "@/components/notices";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { copy } = useCopy();
  return (
    <NoticePage>
      <h1 className="font-display text-4xl">{copy.notices.crashTitle}</h1>
      <p className="mt-3 text-muted-foreground">{copy.notices.crashBody}</p>
      <Button type="button" onClick={reset} className="mt-8 h-12 px-6 text-base">
        {copy.notices.retry}
      </Button>
    </NoticePage>
  );
}
