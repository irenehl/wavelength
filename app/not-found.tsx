import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6">
      <p className="text-sm tracking-[0.18em] text-primary uppercase">Puente</p>
      <h1 className="font-display mt-3 text-4xl">Esta página no está.</h1>
      <Link href="/" className="mt-6 text-sm underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}
