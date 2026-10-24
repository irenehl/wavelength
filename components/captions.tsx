"use client";

import { useEffect, useRef } from "react";

export function Captions({
  eyebrow,
  current,
  lines,
  pending,
  size,
}: {
  eyebrow: string;
  current: string;
  lines: string[];
  pending: string;
  size: "hero" | "quiet";
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const empty = lines.length === 0 && !current;

  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [current, lines]);

  const hero = size === "hero";

  return (
    <section aria-live="polite" aria-relevant="additions text" className="flex min-h-0 flex-col">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{eyebrow}</p>
      <div
        ref={scroller}
        className={
          hero
            ? "mt-4 max-h-[min(58dvh,32rem)] overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,transparent,black_1.25rem,black)]"
            : "mt-3 max-h-40 overflow-y-auto pr-1"
        }
      >
        {empty ? (
          <p className={hero ? "text-lg leading-8 text-muted-foreground" : "text-sm leading-6 text-muted-foreground"}>
            {pending}
          </p>
        ) : (
          <div className={hero ? "flex flex-col gap-4 py-1" : "flex flex-col gap-2 py-1"}>
            {lines.map((line, index) => (
              <p
                key={`${index}-${line.slice(0, 24)}`}
                className={
                  hero
                    ? "font-display text-[1.35rem] leading-snug text-pretty text-foreground/70 sm:text-2xl"
                    : "text-sm leading-6 text-muted-foreground"
                }
              >
                {line}
              </p>
            ))}
            {current ? (
              <p
                className={
                  hero
                    ? "font-display text-[1.35rem] leading-snug text-pretty sm:text-2xl"
                    : "text-sm leading-6 text-foreground"
                }
              >
                {current}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
