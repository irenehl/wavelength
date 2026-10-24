"use client";

import { useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Captions } from "@/components/captions";
import { Eyebrow, Lockup } from "@/components/brand";
import { EventPass } from "@/components/event-pass";
import { useCopy } from "@/components/locale";
import { KeyBanner, LoadingEvent, MissingEvent, ServerError } from "@/components/notices";
import { StatusPill } from "@/components/status-pill";
import { TextSpiral } from "@/components/text-spiral";
import { startCapture } from "@/lib/audio/capture";
import { isValidCode } from "@/lib/code";
import { errorText, type RoomNotice } from "@/lib/copy";
import { languageInPhrase } from "@/lib/languages";
import { useEvent } from "@/lib/use-event";
import { useEventSocket } from "@/lib/use-event-socket";

export function SpeakerStage({ code, name = "" }: { code: string; name?: string }) {
  const event = useEvent(code, name);
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
  const socket = useEventSocket(code, "speaker", true, fallbackName);
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
    <main className="grid flex-1 grid-cols-1 lg:min-h-dvh lg:grid-cols-2">
      <div className="pt-header flex min-w-0 flex-col gap-10 border-b border-border px-6 pb-12 sm:px-10 lg:border-r lg:border-b-0 lg:px-12 xl:px-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Lockup />
          <StatusPill tone={live ? "live" : socket.connected ? "wait" : "off"}>
            {!socket.connected ? text.reconnecting : live ? text.micOpen : text.muted}
          </StatusPill>
        </div>

        <div className="flex flex-col gap-4">
          <Eyebrow>{text.kicker}</Eyebrow>
          <h1 className="font-display text-4xl leading-[1.05] text-balance sm:text-5xl">{name}</h1>
        </div>

        {!keyReady || socket.fatal || socket.error ? (
          <div className="flex flex-col gap-3">
            {!keyReady ? <KeyBanner /> : null}
            {socket.fatal ? <Alert>{errorText(locale, socket.fatal)}</Alert> : null}
            {socket.error ? <Alert>{errorText(locale, socket.error)}</Alert> : null}
          </div>
        ) : null}

        <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
          <button
            type="button"
            onClick={() => void (live ? closeMic() : openMic())}
            disabled={arming || Boolean(socket.fatal)}
            aria-pressed={live}
            aria-label={live ? text.mute : text.openMic}
            className="brand-action relative grid size-24 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-primary"
              style={{ transform: `scale(${1 + level * 0.32})`, opacity: live ? 0.7 : 0 }}
            />
            {live ? <MicOff className="size-7" /> : <Mic className="size-7" />}
          </button>
          <div className="min-w-0">
            <h2 className="font-display text-2xl leading-tight">{arming ? text.arming : live ? text.mute : text.openMic}</h2>
            <p className="mt-2 max-w-prose text-base leading-relaxed text-muted-foreground">{live ? text.liveHelp : text.idleHelp}</p>
            {micError ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {errorText(locale, micError)}
              </p>
            ) : null}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Eyebrow>{text.listeners}</Eyebrow>
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {counts.length === 0 && waiting === 0 ? <li className="py-3 text-base text-muted-foreground">{text.nobody}</li> : null}
            {counts.map((item) => (
              <li key={item.language} className="py-3 text-base">
                {text.count(item.count, languageInPhrase(item.language, locale))}
              </li>
            ))}
            {waiting > 0 ? <li className="py-3 text-base text-muted-foreground">{text.waiting(waiting)}</li> : null}
          </ul>
        </section>

        <Captions
          eyebrow={text.heard}
          current={socket.source.current}
          lines={socket.source.lines}
          pending={live ? text.listening : text.heardPending}
          size="quiet"
        />
      </div>

      <div className="on-dark relative overflow-hidden bg-surface-ink text-on-dark lg:sticky lg:top-0 lg:h-dvh">
        <TextSpiral words={copy.home.spiral} className="absolute inset-0 opacity-30" />
        <div className="relative flex h-full flex-col items-center justify-center px-6 py-12 sm:px-10 lg:pt-[calc(var(--site-header-offset)+1rem)]">
          <EventPass code={code} name={name} />
        </div>
      </div>
    </main>
  );
}

function Alert({ children }: { children: string }) {
  return (
    <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm leading-relaxed">
      {children}
    </p>
  );
}
