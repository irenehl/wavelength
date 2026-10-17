"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCode, isValidCode, normalizeCode } from "@/lib/code";

export function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError("Ponle un nombre al evento.");
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
        setCreateError(body.message || "No pudimos crear el evento.");
        return;
      }
      router.push(`/s/${body.code}`);
    } catch {
      setCreateError("No pudimos hablar con el servidor.");
    } finally {
      setCreating(false);
    }
  }

  async function joinEvent(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeCode(code);
    if (!isValidCode(normalized)) {
      setJoinError("El código tiene 6 caracteres, como K7M P2Q.");
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const response = await fetch(`/api/events/${normalized}`);
      const body = (await response.json()) as { message?: string };
      if (response.status === 404) {
        setJoinError(body.message || "No hay un evento con ese código.");
        return;
      }
      if (!response.ok) {
        setJoinError("No pudimos buscar el evento.");
        return;
      }
      router.push(`/l/${normalized}`);
    } catch {
      setJoinError("No pudimos hablar con el servidor.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-14">
      <p className="text-sm tracking-[0.22em] text-primary uppercase">Puente</p>
      <h1 className="font-display mt-6 max-w-3xl text-5xl leading-[0.95] text-balance sm:text-7xl">
        Una voz para toda la sala.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
        El speaker habla en su idioma. Quien entra con el código o el QR elige el suyo y escucha la misma traducción que el resto del evento.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <form onSubmit={(event) => void createEvent(event)} className="flex flex-col rounded-[2rem] border border-border bg-card/60 p-6 sm:p-8">
          <h2 className="font-display text-3xl">Abrir un evento</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sale un código y un QR. Con eso entra quien quiera escuchar.
          </p>
          <label className="mt-6 text-sm" htmlFor="event-name">
            Nombre
          </label>
          <Input
            id="event-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Lanzamiento en Ciudad de México"
            maxLength={60}
            className="mt-2 h-12 bg-background/40 px-3 text-base"
          />
          {createError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {createError}
            </p>
          ) : null}
          <Button type="submit" disabled={creating} className="mt-6 h-12 text-base">
            {creating ? "Abriendo la sala…" : "Crear evento"}
          </Button>
        </form>

        <form onSubmit={(event) => void joinEvent(event)} className="flex flex-col rounded-[2rem] border border-border bg-card/60 p-6 sm:p-8">
          <h2 className="font-display text-3xl">Entrar a escuchar</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Escribe el código del pase. Si ya tienes el QR, la cámara abre esta misma entrada.
          </p>
          <label className="mt-6 text-sm" htmlFor="event-code">
            Código
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
              {joinError}
            </p>
          ) : null}
          <Button type="submit" disabled={joining} variant="secondary" className="mt-6 h-12 text-base">
            {joining ? "Buscando el evento…" : "Entrar"}
          </Button>
        </form>
      </div>

      <p className="mt-8 max-w-xl text-sm leading-6 text-muted-foreground">
        Hay una traducción por idioma. Cien personas en inglés cuentan como una.
      </p>
    </main>
  );
}
