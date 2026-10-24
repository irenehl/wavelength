"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AILABS_URL, Eyebrow, Lockup } from "@/components/brand";
import { useCopy } from "@/components/locale";
import { TextSpiral } from "@/components/text-spiral";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { formatCode, isValidCode, normalizeCode } from "@/lib/code";
import { listenerPath, speakerPath } from "@/lib/room-link";
import { errorText, type RoomNotice } from "@/lib/copy";
import { OUTPUT_LANGUAGES } from "@/lib/languages";

const NATIVE_NAMES = [
  "English",
  "Español",
  "Português",
  "Français",
  "Deutsch",
  "Italiano",
  "Русский",
  "中文",
  "日本語",
  "한국어",
  "हिन्दी",
  "Bahasa Indonesia",
  "Tiếng Việt",
];

const action = "brand-action h-auto min-h-12 w-fit gap-1.5 rounded-full px-5 text-sm whitespace-normal";
const card =
  "flex min-w-0 scroll-mt-[calc(var(--site-header-offset)+1rem)] flex-col rounded-3xl border border-border bg-card p-6 text-card-foreground sm:p-8 lg:p-10";
const field = "h-12 rounded-xl border-border bg-background px-4 text-base shadow-soft";

export function HomeScreen() {
  const router = useRouter();
  const { locale, copy } = useCopy();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [createError, setCreateError] = useState<RoomNotice | null>(null);
  const [joinError, setJoinError] = useState<RoomNotice | null>(null);
  const text = copy.home;

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError({ code: "name_required" });
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = (await response.json()) as { code?: string; message?: string };
      if (!response.ok || !body.code) {
        setCreateError(
          response.ok ? { code: "create_failed" } : { code: body.code, message: body.message },
        );
        return;
      }
      router.push(speakerPath(body.code, trimmed));
    } catch {
      setCreateError({ code: "reach_server" });
    } finally {
      setCreating(false);
    }
  }

  async function joinEvent(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeCode(code);
    if (!isValidCode(normalized)) {
      setJoinError({ code: "code_format" });
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const response = await fetch(`/api/events/${normalized}`);
      const body = (await response.json()) as { code?: string; name?: string; message?: string };
      if (response.status === 404) {
        setJoinError({ code: body.code || "event_missing", message: body.message });
        return;
      }
      if (!response.ok) {
        setJoinError({ code: "search_failed", message: body.message });
        return;
      }
      router.push(listenerPath(normalized, body.name || ""));
    } catch {
      setJoinError({ code: "reach_server" });
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <section className="grid grid-cols-1 bg-background lg:min-h-dvh lg:grid-cols-2">
        <div className="pt-header flex w-full min-w-0 flex-col gap-10 border-b border-border px-6 pb-12 sm:px-10 lg:gap-12 lg:border-r lg:border-b-0 lg:px-12 xl:px-16">
          <div>
            <Lockup />
          </div>
          <div className="flex flex-1 flex-col justify-center lg:py-12">
            <div className="flex max-w-xl flex-col gap-5">
              <Eyebrow>{text.eyebrow}</Eyebrow>
              <h1 className="font-display text-[clamp(2.125rem,9.5vw,3rem)] leading-[1.08] text-balance sm:text-5xl lg:leading-[1.05] xl:text-6xl">
                {text.title}
              </h1>
              <p className="max-w-xl text-base leading-relaxed md:text-lg">{text.lede}</p>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">{text.sub}</p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a href="#abrir" className={cn(buttonVariants(), action)}>
                  {text.ctaOpen}
                  <ChevronRight />
                </a>
                <a href="#unirme" className={cn(buttonVariants({ variant: "outline" }), action, "hover:bg-input/50")}>
                  {text.ctaJoin}
                  <ChevronRight />
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="relative hidden bg-surface-ink lg:block">
          <TextSpiral words={text.spiral} className="absolute inset-0" />
        </div>
      </section>

      <section aria-label={text.trust(OUTPUT_LANGUAGES.length)} className="bg-trust py-6 text-on-dark md:py-7">
        <div className="page-gutter mx-auto w-full max-w-content">
          <p className="text-sm font-medium text-on-dark/85">{text.trust(OUTPUT_LANGUAGES.length)}</p>
          <div className="mt-2 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <div className="trust-track flex w-max">
              {[0, 1].map((copyIndex) => (
                <ul key={copyIndex} aria-hidden={copyIndex === 1} className="flex shrink-0 items-center gap-12 pr-12">
                  {NATIVE_NAMES.map((name) => (
                    <li key={name} className="flex h-14 items-center text-lg font-medium tracking-tight whitespace-nowrap text-on-dark/90">
                      {name}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="home-use-title" className="section-y bg-background">
        <div className="page-gutter mx-auto w-full max-w-content">
          <div className="grid gap-5 lg:grid-cols-2 lg:items-end lg:gap-12">
            <div className="flex flex-col gap-4">
              <Eyebrow>{text.servicesEyebrow}</Eyebrow>
              <h2 id="home-use-title" className="font-display text-3xl leading-tight sm:text-4xl lg:text-5xl">
                {text.servicesTitle}
              </h2>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{text.servicesBody}</p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 lg:mt-12 lg:grid-cols-2 lg:gap-6">
            <form id="abrir" onSubmit={(event) => void createEvent(event)} className={card} noValidate>
              <Eyebrow>{text.speakerEyebrow}</Eyebrow>
              <h3 className="font-display mt-4 text-2xl leading-tight sm:text-3xl">{text.openTitle}</h3>
              <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">{text.openHelp}</p>
              <ul className="mt-6 flex flex-col divide-y divide-border border-y border-border">
                {text.openPoints.map((point) => (
                  <li key={point} className="py-3 text-sm leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
              <label className="mt-8 text-sm font-medium" htmlFor="event-name">
                {text.name}
              </label>
              <Input
                id="event-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={text.namePlaceholder}
                maxLength={60}
                className={`mt-2 ${field}`}
              />
              {createError ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {errorText(locale, createError)}
                </p>
              ) : null}
              <div className="mt-auto pt-8">
                <Button type="submit" disabled={creating} className={action}>
                  {creating ? text.creating : text.create}
                  <ChevronRight />
                </Button>
              </div>
            </form>

            <form id="unirme" onSubmit={(event) => void joinEvent(event)} className={card} noValidate>
              <Eyebrow>{text.listenerEyebrow}</Eyebrow>
              <h3 className="font-display mt-4 text-2xl leading-tight sm:text-3xl">{text.joinTitle}</h3>
              <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">{text.joinHelp}</p>
              <ul className="mt-6 flex flex-col divide-y divide-border border-y border-border">
                {text.joinPoints.map((point) => (
                  <li key={point} className="py-3 text-sm leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
              <label className="mt-8 text-sm font-medium" htmlFor="event-code">
                {text.code}
              </label>
              <Input
                id="event-code"
                value={code}
                onChange={(event) => setCode(formatCode(event.target.value).slice(0, 7))}
                placeholder="K7M P2Q"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className={`mt-2 font-mono tracking-[0.2em] uppercase ${field}`}
              />
              {joinError ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {errorText(locale, joinError)}
                </p>
              ) : null}
              <div className="mt-auto pt-8">
                <Button type="submit" disabled={joining} className={action}>
                  {joining ? text.joining : text.join}
                  <ChevronRight />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section aria-labelledby="home-method-title" className="section-y border-y border-border bg-surface-soft/35">
        <div className="page-gutter mx-auto w-full max-w-content">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div className="flex flex-col gap-4">
              <Eyebrow>{text.methodEyebrow}</Eyebrow>
              <h2 id="home-method-title" className="font-display max-w-lg text-3xl leading-tight sm:text-4xl lg:text-5xl">
                {text.methodTitle}
              </h2>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">{text.methodBody}</p>
            </div>
            <ol className="flex flex-col divide-y divide-border border-t border-border">
              {text.steps.map((step, index) => (
                <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-4 py-6 first:pt-5 sm:gap-6">
                  <span aria-hidden className="pt-1 font-mono text-xs text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl">{step.title}</h3>
                    <p className="mt-2 max-w-prose text-base leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="on-dark section-y relative overflow-hidden bg-surface-ink text-on-dark">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-b from-purple/35 via-surface-ink to-surface-ink" />
        <div className="page-gutter relative mx-auto flex w-full max-w-content flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="flex max-w-xl min-w-0 flex-col gap-4 md:gap-5">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl">{text.ctaTitle}</h2>
            <p className="text-base leading-relaxed text-on-dark/75 md:text-lg">{text.ctaBody}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a href="#abrir" className={cn(buttonVariants(), action, "px-8")}>
              {text.ctaOpen}
              <ChevronRight />
            </a>
            <a
              href={AILABS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline" }),
                action,
                "border-on-dark/25 bg-transparent px-8 text-on-dark hover:bg-on-dark/10 hover:text-on-dark",
              )}
            >
              {text.ctaTalk}
              <ChevronRight />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
