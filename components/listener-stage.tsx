"use client";

import { useState } from "react";
import { Captions } from "@/components/captions";
import { ChevronRight } from "lucide-react";
import { Eyebrow, Lockup } from "@/components/brand";
import { LanguagePicker } from "@/components/language-picker";
import { useCopy } from "@/components/locale";
import { KeyBanner, LoadingEvent, MissingEvent, ServerError } from "@/components/notices";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { isValidCode } from "@/lib/code";
import { errorText } from "@/lib/copy";
import { languageInPhrase, languageLabel, type OutputLanguage } from "@/lib/languages";
import { useEvent } from "@/lib/use-event";
import { useEventSocket } from "@/lib/use-event-socket";

export function ListenerStage({ code, name = "" }: { code: string; name?: string }) {
  const event = useEvent(code, name);
  if (!isValidCode(code)) return <MissingEvent code={code} />;
  if (event.status === "loading") return <LoadingEvent />;
  if (event.status === "missing") return <MissingEvent code={code} />;
  if (event.status === "error") return <ServerError />;
  return <ListenerLive code={code} fallbackName={event.event.name} apiKeyConfigured={event.event.apiKeyConfigured} />;
}

function ListenerLive({
  code,
  fallbackName,
  apiKeyConfigured,
}: {
  code: string;
  fallbackName: string;
  apiKeyConfigured: boolean;
}) {
  const socket = useEventSocket(code, "listener", true);
  const { locale, copy } = useCopy();
  const text = copy.listener;
  const [language, setLanguage] = useState<OutputLanguage>("en");
  const [draft, setDraft] = useState<OutputLanguage>("en");
  const [listening, setListening] = useState(false);
  const [choosing, setChoosing] = useState(true);
  const [volume, setVolume] = useState(1);
  const room = socket.room;
  const name = room?.name || fallbackName;
  const keyReady = room?.apiKeyConfigured ?? apiKeyConfigured;
  const speakerLive = Boolean(room?.speakerPresent && room.micLive);

  async function start(next = language) {
    await socket.player?.resume();
    socket.player?.setVolume(volume);
    socket.announceListen(next);
    setLanguage(next);
    setListening(true);
    setChoosing(false);
  }

  let tone: "live" | "wait" | "off" = "off";
  let status = text.connecting;
  if (socket.fatal) {
    status = text.closed;
  } else if (!socket.connected) {
    status = text.reconnecting;
  } else if (!room?.speakerPresent) {
    tone = "wait";
    status = text.noSpeaker;
  } else if (!speakerLive) {
    tone = "wait";
    status = text.muted;
  } else {
    tone = "live";
    status = text.live;
  }

  const action = "brand-action h-auto min-h-12 gap-1.5 rounded-full px-5 text-sm whitespace-normal";

  return (
    <main className="page-gutter pt-header mx-auto flex w-full max-w-3xl flex-1 flex-col pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Lockup />
        <StatusPill tone={tone}>{status}</StatusPill>
      </div>

      <header className="mt-10 flex flex-col gap-3">
        <Eyebrow>{text.kicker}</Eyebrow>
        <h1 className="font-display text-4xl leading-[1.05] text-balance sm:text-5xl">{name}</h1>
        {listening ? <p className="text-base text-muted-foreground">{text.room(languageInPhrase(language, locale))}</p> : null}
      </header>

      {!keyReady || socket.fatal || socket.error ? (
        <div className="mt-6 flex flex-col gap-3">
          {!keyReady ? <KeyBanner /> : null}
          {socket.fatal ? (
            <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
              {errorText(locale, socket.fatal)}
            </p>
          ) : null}
          {socket.error ? (
            <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
              {errorText(locale, socket.error)}
            </p>
          ) : null}
        </div>
      ) : null}

      {choosing ? (
        <section className="mt-10 flex flex-1 flex-col rounded-3xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-2xl leading-tight sm:text-3xl">{text.ask}</h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">{text.blurb(languageLabel(draft, locale))}</p>
          <div className="mt-6">
            <LanguagePicker value={draft} onChange={setDraft} />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="button" className={action} onClick={() => void start(draft)}>
              {text.listenIn(languageInPhrase(draft, locale))}
              <ChevronRight />
            </Button>
            {listening ? (
              <Button
                type="button"
                variant="outline"
                className={`${action} hover:bg-input/50`}
                onClick={() => {
                  setDraft(language);
                  setChoosing(false);
                }}
              >
                {text.stayIn(languageInPhrase(language, locale))}
              </Button>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="mt-10 flex flex-1 flex-col">
          {!room?.speakerPresent ? (
            <p className="text-muted-foreground">{text.speakerAway}</p>
          ) : !speakerLive ? (
            <p className="text-muted-foreground">{text.speakerMuted}</p>
          ) : null}

          <div className="mt-4 flex-1">
            <Captions
              eyebrow={text.translation}
              current={socket.translation.current}
              lines={socket.translation.lines}
              pending={speakerLive ? text.listening : text.translationPending}
              size="hero"
            />
          </div>

          <div className="mt-10 border-t border-border pt-6">
            <Captions
              eyebrow={text.original}
              current={socket.source.current}
              lines={socket.source.lines}
              pending={text.originalPending}
              size="quiet"
            />
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              {text.volume}
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                aria-valuetext={`${Math.round(volume * 100)}%`}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setVolume(next);
                  socket.player?.setVolume(next);
                }}
                className="w-40 accent-primary"
              />
            </label>
            <Button type="button" variant="outline" className={`${action} hover:bg-input/50`} onClick={() => setChoosing(true)}>
              {text.change}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
