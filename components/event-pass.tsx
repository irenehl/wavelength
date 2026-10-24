"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Maximize2 } from "lucide-react";
import { BrandMark, PoweredBy } from "@/components/brand";
import { LocaleSwitch, useCopy } from "@/components/locale";
import { Button } from "@/components/ui/button";
import { formatCode } from "@/lib/code";
import { copyFor } from "@/lib/copy";

export function EventPass({ code, name }: { code: string; name: string }) {
  const { locale, copy } = useCopy();
  const text = copy.pass;
  const otherScan = copyFor(locale === "es" ? "en" : "es").pass.scan;
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
      color: { dark: "#1a1a1a", light: "#fafafa" },
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
      <section className="surface-ink flex flex-col rounded-2xl border border-white/10 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">{text.kicker}</p>
          <LocaleSwitch tone="ink" />
        </div>
        <h2 className="font-display mt-2 text-3xl leading-tight">{name}</h2>
        <p className="font-display mt-8 whitespace-nowrap text-4xl tracking-[0.08em] sm:text-5xl">{readable}</p>
        <p className="mt-2 text-sm text-white/65">{text.help}</p>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={text.qrAlt(name)} className="size-40 rounded-xl bg-background p-2 sm:size-48" />
          ) : (
            <div className="size-40 animate-pulse rounded-xl bg-white/10 sm:size-48" />
          )}
          <div className="flex flex-col gap-2">
            <Button type="button" className="h-11 px-5" onClick={() => void copyLink()}>
              {copied ? <Check /> : <Copy />}
              {copied ? text.copied : text.copy}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 border-white/25 bg-transparent px-5 text-on-ink hover:bg-white/10 hover:text-on-ink"
              onClick={() => setProjecting(true)}
            >
              <Maximize2 />
              {text.project}
            </Button>
          </div>
        </div>
      </section>

      {projecting ? (
        <div className="surface-ink fixed inset-0 z-50 flex flex-col overflow-y-auto px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between gap-3">
            <BrandMark tone="ink" />
            <LocaleSwitch tone="ink" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
            <p className="text-sm font-semibold tracking-wider text-primary uppercase">{name}</p>
            <p className="font-display mt-4 whitespace-nowrap text-[clamp(3.5rem,13vw,9rem)] leading-none tracking-[0.06em]">
              {readable}
            </p>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={text.qrAlt(name)} className="mt-8 size-60 rounded-2xl bg-background p-3 sm:size-80" />
            ) : null}
            <p className="mt-6 max-w-lg text-lg">{text.scan}</p>
            <p className="mt-2 max-w-lg text-base text-white/60">{otherScan}</p>
            <Button type="button" className="mt-8 h-12 px-8 text-base" onClick={() => setProjecting(false)}>
              {text.close}
            </Button>
          </div>
          <div className="flex justify-center">
            <PoweredBy tone="ink" />
          </div>
        </div>
      ) : null}
    </>
  );
}
