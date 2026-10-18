"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm tracking-[0.22em] text-primary uppercase">Puente</p>
        <LocaleSwitch />
      </div>
      <h1 className="font-display mt-6 max-w-3xl text-5xl leading-[0.95] text-balance sm:text-7xl">{text.title}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{text.lede}</p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <form onSubmit={(event) => void createEvent(event)} className="flex flex-col rounded-[2rem] border border-border bg-card/60 p-6 sm:p-8">
          <h2 className="font-display text-3xl">{text.openTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{text.openHelp}</p>
          <label className="mt-6 text-sm" htmlFor="event-name">
            {text.name}
          </label>
          <Input
            id="event-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={text.namePlaceholder}
            maxLength={60}
            className="mt-2 h-12 bg-background/40 px-3 text-base"
          />
          {createError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {errorText(locale, createError)}
            </p>
          ) : null}
          <Button type="submit" disabled={creating} className="mt-6 h-12 text-base">
            {creating ? text.creating : text.create}
          </Button>
        </form>

        <form onSubmit={(event) => void joinEvent(event)} className="flex flex-col rounded-[2rem] border border-border bg-card/60 p-6 sm:p-8">
          <h2 className="font-display text-3xl">{text.joinTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{text.joinHelp}</p>
          <label className="mt-6 text-sm" htmlFor="event-code">
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
            className="font-display mt-2 h-14 bg-background/40 px-3 text-2xl tracking-[0.14em]"
          />
          {joinError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {errorText(locale, joinError)}
            </p>
          ) : null}
          <Button type="submit" disabled={joining} variant="secondary" className="mt-6 h-12 text-base">
            {joining ? text.joining : text.join}
          </Button>
        </form>
      </div>

      <p className="mt-8 max-w-xl text-sm leading-6 text-muted-foreground">{text.footnote}</p>
    </main>
  );
}
