"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { Check, Copy, Maximize2 } from "lucide-react";
import { Eyebrow, Lockup, PoweredBy } from "@/components/brand";
import { LocaleSwitch, useCopy } from "@/components/locale";
import { TextSpiral } from "@/components/text-spiral";
import { Button } from "@/components/ui/button";
import { formatCode } from "@/lib/code";
import { listenerPath } from "@/lib/room-link";
import { copyFor } from "@/lib/copy";

export function EventPass({ code, name }: { code: string; name: string }) {
  const { locale, copy } = useCopy();
  const text = copy.pass;
  const otherScan = copyFor(locale === "es" ? "en" : "es").pass.scan;
  const spiral = copy.home.spiral;
  const [src, setSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const readable = formatCode(code);

  useEffect(() => {
    const url = `${window.location.origin}${listenerPath(code, name)}`;
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
  }, [code, name]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${listenerPath(code, name)}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const action =
    "brand-action h-auto min-h-12 gap-1.5 rounded-full px-5 text-sm";

  return (
    <>
      <section className="shadow-panel w-full max-w-md rounded-3xl border border-on-dark/12 bg-surface-ink/85 p-6 text-center backdrop-blur-md sm:p-8">
        <Eyebrow>{text.kicker}</Eyebrow>
        <h2 className="font-display mt-3 text-2xl leading-tight text-balance sm:text-3xl">
          {name}
        </h2>
        <p className="font-display mt-6 text-5xl leading-none tracking-[0.06em] whitespace-nowrap sm:text-6xl">
          {readable}
        </p>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-on-dark/65">
          {text.help}
        </p>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={text.qrAlt(name)}
            className="mx-auto mt-6 size-48 rounded-2xl bg-background p-3 sm:size-56"
          />
        ) : (
          <div className="mx-auto mt-6 size-48 animate-pulse rounded-2xl bg-on-dark/10 sm:size-56" />
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            className={action}
            onClick={() => void copyLink()}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? text.copied : text.copy}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`${action} border-on-dark/25 bg-transparent text-on-dark hover:bg-on-dark/10 hover:text-on-dark`}
            onClick={() => setProjecting(true)}
          >
            <Maximize2 />
            {text.project}
          </Button>
        </div>
      </section>

      {projecting
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={text.kicker}
              className="on-dark fixed inset-0 z-50 flex flex-col overflow-y-auto bg-surface-ink text-on-dark"
            >
              <TextSpiral
                words={spiral}
                className="absolute inset-0 opacity-15"
              />
              <div className="relative flex items-center justify-between gap-3 px-6 pt-6 sm:px-10">
                <Lockup tone="ink" />
                <LocaleSwitch />
              </div>
              <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
                <Eyebrow>{name}</Eyebrow>
                <p className="font-display mt-4 text-[clamp(3.5rem,13vw,9rem)] leading-none tracking-[0.06em] whitespace-nowrap">
                  {readable}
                </p>
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={text.qrAlt(name)}
                    className="mt-8 size-60 rounded-3xl bg-background p-4 sm:size-80"
                  />
                ) : null}
                <p className="mt-6 max-w-lg text-lg">{text.scan}</p>
                <p className="mt-2 max-w-lg text-base text-on-dark/60">
                  {otherScan}
                </p>
                <Button
                  type="button"
                  className={`${action} mt-8 px-8`}
                  onClick={() => setProjecting(false)}
                >
                  {text.close}
                </Button>
              </div>
              <div className="relative flex justify-center pb-6">
                <PoweredBy />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
