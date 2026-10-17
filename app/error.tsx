"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6">
      <p className="text-sm tracking-[0.18em] text-primary uppercase">Puente</p>
      <h1 className="font-display mt-3 text-4xl">Se cortó la página.</h1>
      <p className="mt-3 text-muted-foreground">La sala sigue del lado del servidor. Recarga esta vista.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-12 rounded-full bg-primary px-5 text-base font-medium text-primary-foreground"
      >
        Reintentar
      </button>
    </main>
  );
}
