"use client";

import { useCopy } from "@/components/locale";
import { BackHome, NoticePage } from "@/components/notices";

export default function NotFound() {
  const { copy } = useCopy();
  return (
    <NoticePage>
      <h1 className="font-display text-4xl leading-[1.05] text-balance sm:text-5xl">{copy.notices.notFound}</h1>
      <BackHome />
    </NoticePage>
  );
}
