"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCode } from "@/lib/code";

export function EventPass({ code, name }: { code: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const readable = formatCode(code);

  useEffect(() => {
    const url = `${window.location.origin}/l/${code}`;
    let cancel = false;
    QRCode.toDataURL(url, {
      margin: 1,
      width: 640,
      color: { dark: "#1c1712", light: "#f3ecdf" },
    })
      .then((value) => {
        if (!cancel) setSrc(value);
      })
      .catch(() => {
        if (!cancel) setSrc(null);
      });
    return () => {
      cancel = true;
    };
  }, [code]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/l/${code}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <section className="pass-paper flex flex-col rounded-[2rem] p-6 sm:p-8">
        <p className="text-xs tracking-[0.18em] uppercase">Pase del evento</p>
        <h2 className="font-display mt-2 text-3xl leading-tight">{name}</h2>
        <p className="font-display mt-8 whitespace-nowrap text-4xl tracking-[0.08em] sm:text-5xl">{readable}</p>
        <p className="mt-2 text-sm text-[#1c1712]/70">Un código para todo el evento. El idioma se elige al entrar.</p>
        <div className="mt-6 flex items-end justify-between gap-4">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={`QR para entrar a ${name}`} className="size-40 sm:size-48" />
          ) : (
            <div className="size-40 animate-pulse rounded-2xl bg-[#1c1712]/10 sm:size-48" />
          )}
          <div className="flex flex-col gap-2">
            <Button type="button" variant="secondary" className="h-11 bg-[#1c1712] text-[#f3ecdf] hover:bg-[#1c1712]/90" onClick={() => void copyLink()}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado" : "Copiar enlace"}
            </Button>
            <Button type="button" variant="outline" className="h-11 border-[#1c1712]/20 bg-transparent text-[#1c1712]" onClick={() => setProjecting(true)}>
              <Maximize2 />
              Proyectar
            </Button>
          </div>
        </div>
      </section>

      {projecting ? (
        <div className="pass-paper fixed inset-0 z-50 flex flex-col items-center justify-center px-6 py-10 text-center">
          <p className="text-sm tracking-[0.22em] uppercase">{name}</p>
          <p className="font-display mt-6 text-[clamp(4.5rem,14vw,9rem)] leading-none tracking-[0.06em]">{readable}</p>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={`QR para entrar a ${name}`} className="mt-8 size-64 sm:size-80" />
          ) : null}
          <p className="mt-6 max-w-md text-lg">Escanea para escuchar en tu idioma, o entra con el código.</p>
          <Button type="button" className="mt-8 h-12 bg-[#1c1712] px-6 text-[#f3ecdf] hover:bg-[#1c1712]/90" onClick={() => setProjecting(false)}>
            Cerrar pase
          </Button>
        </div>
      ) : null}
    </>
  );
}
