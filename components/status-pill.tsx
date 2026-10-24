export function StatusPill({
  tone,
  children,
}: {
  tone: "live" | "wait" | "off";
  children: string;
}) {
  const dot = tone === "live" ? "bg-purple" : tone === "wait" ? "bg-foreground/60" : "bg-muted-foreground/60";
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-background px-3.5 text-xs font-semibold tracking-wider uppercase shadow-soft">
      <span className="relative flex size-2">
        {tone === "live" ? <span className="absolute inset-0 animate-ping rounded-full bg-purple/70 motion-reduce:hidden" /> : null}
        <span className={`relative size-2 rounded-full ${dot}`} />
      </span>
      {children}
    </span>
  );
}
