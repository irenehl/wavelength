"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BrandBar, Eyebrow } from "@/components/brand";
import { LocaleSwitch, useCopy } from "@/components/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCode, isValidCode, normalizeCode } from "@/lib/code";
import { errorText, type RoomNotice } from "@/lib/copy";

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
      router.push(`/s/${body.code}`);
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
      const body = (await response.json()) as { code?: string; message?: string };
      if (response.status === 404) {
        setJoinError({ code: body.code || "event_missing", message: body.message });
        return;
      }
      if (!response.ok) {
        setJoinError({ code: "search_failed", message: body.message });
        return;
      }
      router.push(`/l/${normalized}`);
    } catch {
      setJoinError({ code: "reach_server" });
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-14">
      <BrandBar>
        <LocaleSwitch />
      </BrandBar>
      <Eyebrow className="mt-12 sm:mt-16">{text.eyebrow}</Eyebrow>
      <h1 className="font-display mt-4 max-w-3xl text-5xl leading-[1.02] text-balance sm:text-7xl">
        {text.title} <span className="text-muted-foreground">{text.titleTail}</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{text.lede}</p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <form onSubmit={(event) => void createEvent(event)} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[0_1px_0_rgba(26,26,26,0.03)] sm:p-8">
          <h2 className="font-display text-2xl sm:text-3xl">{text.openTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{text.openHelp}</p>
          <label className="mt-6 text-sm font-medium" htmlFor="event-name">
            {text.name}
          </label>
          <Input
            id="event-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={text.namePlaceholder}
            maxLength={60}
            className="mt-2 h-12 bg-background px-3 text-base"
          />
          {createError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {errorText(locale, createError)}
            </p>
          ) : null}
          <Button type="submit" disabled={creating} className="mt-6 h-12 px-6 text-base">
            {creating ? text.creating : text.create}
          </Button>
        </form>

        <form onSubmit={(event) => void joinEvent(event)} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[0_1px_0_rgba(26,26,26,0.03)] sm:p-8">
          <h2 className="font-display text-2xl sm:text-3xl">{text.joinTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{text.joinHelp}</p>
          <label className="mt-6 text-sm font-medium" htmlFor="event-code">
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
            className="font-display mt-2 h-14 bg-background px-3 text-2xl tracking-[0.14em]"
          />
          {joinError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {errorText(locale, joinError)}
            </p>
          ) : null}
          <Button type="submit" disabled={joining} variant="outline" className="mt-6 h-12 border-foreground/80 px-6 text-base hover:bg-foreground hover:text-background">
            {joining ? text.joining : text.join}
          </Button>
        </form>
      </div>

      <p className="mt-8 max-w-xl text-sm leading-6 text-muted-foreground">{text.footnote}</p>
    </main>
  );
}
