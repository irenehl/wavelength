export function StatusPill({
  tone,
  children,
}: {
  tone: "live" | "wait" | "off";
  children: string;
}) {
  const dot =
    tone === "live" ? "bg-primary" : tone === "wait" ? "bg-foreground/70" : "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs tracking-wide uppercase">
      <span className={`size-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}
