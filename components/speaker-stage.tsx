"use client";

import { useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Captions } from "@/components/captions";
import { EventPass } from "@/components/event-pass";
import { LocaleSwitch, useCopy } from "@/components/locale";
import { KeyBanner, LoadingEvent, MissingEvent, ServerError } from "@/components/notices";
import { StatusPill } from "@/components/status-pill";
import { startCapture } from "@/lib/audio/capture";
import { isValidCode } from "@/lib/code";
import { errorText, type RoomNotice } from "@/lib/copy";
import { languageInPhrase } from "@/lib/languages";
import { useEvent } from "@/lib/use-event";
import { useEventSocket } from "@/lib/use-event-socket";

export function SpeakerStage({ code }: { code: string }) {
  const event = useEvent(code);
  if (!isValidCode(code)) return <MissingEvent code={code} />;
  if (event.status === "loading") return <LoadingEvent />;
  if (event.status === "missing") return <MissingEvent code={code} />;
  if (event.status === "error") return <ServerError />;
  return <SpeakerLive code={code} fallbackName={event.event.name} apiKeyConfigured={event.event.apiKeyConfigured} />;
}

function SpeakerLive({
  code,
  fallbackName,
  apiKeyConfigured,
}: {
  code: string;
  fallbackName: string;
  apiKeyConfigured: boolean;
}) {
  const socket = useEventSocket(code, "speaker", true);
  const { locale, copy } = useCopy();
  const text = copy.speaker;
  const capture = useRef<{ stop: () => void } | null>(null);
  const [live, setLive] = useState(false);
  const [arming, setArming] = useState(false);
  const [level, setLevel] = useState(0);
  const [micError, setMicError] = useState<RoomNotice | null>(null);
  const room = socket.room;
  const name = room?.name || fallbackName;
  const keyReady = room?.apiKeyConfigured ?? apiKeyConfigured;

  async function openMic() {
    setMicError(null);
    setArming(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      capture.current = await startCapture(stream, (pcm) => socket.sendAudio(pcm), setLevel);
      socket.announceMic(true);
      setLive(true);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setMicError({ code: name === "NotAllowedError" ? "mic_blocked" : "mic_missing" });
    } finally {
      setArming(false);
    }
  }

  function closeMic() {
    capture.current?.stop();
    capture.current = null;
    setLevel(0);
    setLive(false);
    socket.announceMic(false);
  }

  const counts = room?.listenerCounts ?? [];
  const waiting = room?.waiting ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.18em] text-primary uppercase">Puente</p>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">{name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          <StatusPill tone={live ? "live" : socket.connected ? "wait" : "off"}>
            {!socket.connected ? text.reconnecting : live ? text.micOpen : text.muted}
          </StatusPill>
        </div>
      </header>

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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(18rem,24rem)_1fr]">
        <EventPass code={code} name={name} />

        <div className="flex flex-col gap-6">
          <section className="rounded-[2rem] border border-border bg-card/50 px-6 py-8">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => void (live ? closeMic() : openMic())}
                disabled={arming || Boolean(socket.fatal)}
                aria-pressed={live}
                aria-label={live ? text.mute : text.openMic}
                className="relative grid size-32 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
              >
                <span
                  className="absolute inset-0 rounded-full border border-primary"
                  style={{ transform: `scale(${1 + level * 0.28})`, opacity: live ? 0.7 : 0 }}
                />
                {live ? <MicOff className="size-8" /> : <Mic className="size-8" />}
              </button>
              <p className="mt-5 text-lg">{arming ? text.arming : live ? text.mute : text.openMic}</p>
              <p className="mt-2 max-w-sm text-center text-sm leading-6 text-muted-foreground">
                {live ? text.liveHelp : text.idleHelp}
              </p>
              {micError ? (
                <p role="alert" className="mt-4 text-center text-sm text-destructive">
                  {errorText(locale, micError)}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-border px-6 py-5">
            <h2 className="text-sm tracking-[0.16em] text-muted-foreground uppercase">{text.listeners}</h2>
            {counts.length === 0 && waiting === 0 ? (
              <p className="mt-3 text-lg">{text.nobody}</p>
            ) : (
              <ul className="mt-3 space-y-1 text-lg">
                {counts.map((item) => (
                  <li key={item.language}>{text.count(item.count, languageInPhrase(item.language, locale))}</li>
                ))}
                {waiting > 0 ? <li className="text-muted-foreground">{text.waiting(waiting)}</li> : null}
              </ul>
            )}
          </section>

          <section className="rounded-[2rem] border border-border px-6 py-5">
            <Captions
              eyebrow={text.heard}
              current={socket.source.current}
              lines={socket.source.lines}
              pending={live ? text.listening : text.heardPending}
              size="quiet"
            />
          </section>
        </div>
      </div>
    </main>
  );
}
