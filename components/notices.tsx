import Link from "next/link";

export function KeyBanner() {
  return (
    <p role="status" className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm leading-6">
      Falta la llave de OpenAI en el servidor. La sala está abierta, pero la traducción no arranca hasta
      configurar <span className="font-medium">OPENAI_API_KEY</span>.
    </p>
  );
}

export function MissingEvent({ code }: { code: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6">
      <p className="text-sm tracking-[0.18em] text-primary uppercase">Puente</p>
      <h1 className="font-display mt-3 text-4xl leading-tight">Ese código no corresponde a un evento abierto.</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        {code ? (
          <>
            Buscamos <span className="text-foreground">{code}</span>.{" "}
          </>
        ) : null}
        Los eventos viven mientras este servidor está encendido. Si se reinició, hay que crear el evento de nuevo.
      </p>
      <Link href="/" className="mt-6 text-sm underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}

export function LoadingEvent() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6">
      <p className="text-sm tracking-[0.18em] text-primary uppercase">Puente</p>
      <h1 className="font-display mt-3 text-4xl">Buscando el evento…</h1>
    </main>
  );
}

export function ServerError() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6">
      <p className="text-sm tracking-[0.18em] text-primary uppercase">Puente</p>
      <h1 className="font-display mt-3 text-4xl">No pudimos hablar con el servidor.</h1>
      <p className="mt-4 leading-7 text-muted-foreground">Recarga la página. Si acabas de abrir Puente, espera un momento y vuelve a intentar.</p>
    </main>
  );
}
