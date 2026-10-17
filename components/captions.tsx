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
  const history = lines.slice(-4);
  return (
    <section aria-live="polite" aria-relevant="additions text">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">{eyebrow}</p>
      <div className={size === "hero" ? "mt-4 space-y-2" : "mt-3 space-y-1"}>
        {history.map((line, index) => (
          <p
            key={`${index}-${line.slice(0, 16)}`}
            className={
              size === "hero"
                ? "font-display text-xl leading-snug text-foreground/45"
                : "text-sm leading-6 text-muted-foreground"
            }
          >
            {line}
          </p>
        ))}
      </div>
      <p
        className={
          size === "hero"
            ? "font-display mt-3 text-[clamp(2rem,6vw,4.25rem)] leading-[1.05] text-balance"
            : "mt-2 text-lg leading-7"
        }
      >
        {current || <span className="text-muted-foreground italic">{pending}</span>}
      </p>
    </section>
  );
}
