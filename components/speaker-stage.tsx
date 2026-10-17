"use client";

import { useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Captions } from "@/components/captions";
import { EventPass } from "@/components/event-pass";
import { KeyBanner, LoadingEvent, MissingEvent, ServerError } from "@/components/notices";
import { StatusPill } from "@/components/status-pill";
import { startCapture } from "@/lib/audio/capture";
import { isValidCode } from "@/lib/code";
import { languageLabel } from "@/lib/languages";
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
  const capture = useRef<{ stop: () => void } | null>(null);
  const [live, setLive] = useState(false);
  const [arming, setArming] = useState(false);
  const [level, setLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
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
      setMicError(
        name === "NotAllowedError"
          ? "El navegador bloqueó el micrófono. Permítelo y vuelve a intentar."
          : "No encontramos un micrófono que podamos usar.",
      );
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
        <StatusPill tone={live ? "live" : socket.connected ? "wait" : "off"}>
          {!socket.connected ? "Reconectando" : live ? "Micrófono abierto" : "En silencio"}
        </StatusPill>
      </header>

      {!keyReady ? <KeyBanner /> : null}
      {socket.fatal ? (
        <p role="alert" className="rounded-2xl border border-destructive/40 px-4 py-3 text-sm">
          {socket.fatal}
        </p>
      ) : null}
      {socket.error ? (
        <p role="alert" className="rounded-2xl border border-destructive/40 px-4 py-3 text-sm">
          {socket.error}
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
                aria-label={live ? "Silenciar" : "Abrir micrófono"}
                className="relative grid size-32 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
              >
                <span
                  className="absolute inset-0 rounded-full border border-primary"
                  style={{ transform: `scale(${1 + level * 0.28})`, opacity: live ? 0.7 : 0 }}
                />
                {live ? <MicOff className="size-8" /> : <Mic className="size-8" />}
              </button>
              <p className="mt-5 text-lg">{arming ? "Pidiendo el micrófono…" : live ? "Silenciar" : "Abrir micrófono"}</p>
              <p className="mt-2 max-w-sm text-center text-sm leading-6 text-muted-foreground">
                {live
                  ? "La traducción corre solo mientras hay alguien en un idioma. Al silenciar, se cierra."
                  : "Cuando abras el micrófono, el evento escucha en el idioma que haya elegido."}
              </p>
              {micError ? (
                <p role="alert" className="mt-4 text-center text-sm text-destructive">
                  {micError}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-border px-6 py-5">
            <h2 className="text-sm tracking-[0.16em] text-muted-foreground uppercase">Oyentes</h2>
            {counts.length === 0 && waiting === 0 ? (
              <p className="mt-3 text-lg">Nadie ha elegido idioma todavía.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-lg">
                {counts.map((item) => (
                  <li key={item.language}>
                    {item.count} {item.count === 1 ? "persona" : "personas"} en {languageLabel(item.language).toLowerCase()}
                  </li>
                ))}
                {waiting > 0 ? (
                  <li className="text-muted-foreground">
                    {waiting} {waiting === 1 ? "persona está" : "personas están"} eligiendo idioma
                  </li>
                ) : null}
              </ul>
            )}
          </section>

          <section className="rounded-[2rem] border border-border px-6 py-5">
            <Captions
              eyebrow="Lo que se entendió"
              current={socket.source.current}
              lines={socket.source.lines}
              pending={live ? "Escuchando…" : "El original aparece aquí cuando hables."}
              size="quiet"
            />
          </section>
        </div>
      </div>
    </main>
  );
}
