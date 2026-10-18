"use client";

import { useState } from "react";
import { Captions } from "@/components/captions";
import { LanguagePicker } from "@/components/language-picker";
import { LocaleSwitch, useCopy } from "@/components/locale";
import { KeyBanner, LoadingEvent, MissingEvent, ServerError } from "@/components/notices";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { isValidCode } from "@/lib/code";
import { errorText } from "@/lib/copy";
import { languageInPhrase, languageLabel, type OutputLanguage } from "@/lib/languages";
import { useEvent } from "@/lib/use-event";
import { useEventSocket } from "@/lib/use-event-socket";

export function ListenerStage({ code }: { code: string }) {
  const event = useEvent(code);
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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-1 flex-col px-5 py-5 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-primary uppercase">Puente</p>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">{name}</h1>
          {listening ? (
            <p className="mt-1 text-sm text-muted-foreground">{text.room(languageInPhrase(language, locale))}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          <StatusPill tone={tone}>{status}</StatusPill>
        </div>
      </header>

      <div className="mt-5 flex flex-col gap-4">
        {!keyReady ? <KeyBanner /> : null}
        {socket.fatal ? (
          <p role="alert" className="rounded-2xl border border-destructive/40 px-4 py-3 text-sm">
            {errorText(locale, socket.fatal)}
          </p>
        ) : null}
        {socket.error && !(keyReady && socket.error.code === "missing_key") ? (
          <p role="alert" className="rounded-2xl border border-destructive/40 px-4 py-3 text-sm">
            {errorText(locale, socket.error)}
          </p>
        ) : null}
      </div>

      {choosing ? (
        <section className="mt-8 flex flex-1 flex-col">
          <h2 className="font-display text-4xl leading-tight">{text.ask}</h2>
          <p className="mt-3 max-w-xl leading-7 text-muted-foreground">{text.blurb(languageLabel(draft, locale))}</p>
          <div className="mt-6">
            <LanguagePicker value={draft} onChange={setDraft} />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button type="button" className="h-12 flex-1 text-base" onClick={() => void start(draft)}>
              {text.listenIn(languageInPhrase(draft, locale))}
            </Button>
            {listening ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 text-base"
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
        <section className="mt-8 flex flex-1 flex-col">
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

          <div className="mt-8 border-t border-border pt-5">
            <Captions
              eyebrow={text.original}
              current={socket.source.current}
              lines={socket.source.lines}
              pending={text.originalPending}
              size="quiet"
            />
          </div>

          <div className="mt-6 flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
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
                className="w-36 accent-primary"
              />
            </label>
            <Button type="button" variant="outline" className="h-11" onClick={() => setChoosing(true)}>
              {text.change}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
