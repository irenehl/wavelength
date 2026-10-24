"use client";

import { useEffect, useRef } from "react";

const MONO = `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
const DOT = "·";
const TAU = Math.PI * 2;
const SPIN_SECONDS = 160;
const FRAME_MS = 1000 / 24;

type Glyph = { char: string; angle: number };
type Ring = { radius: number; size: number; direction: 1 | -1; glyphs: Glyph[] };

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Words thin out around one side of each ring, which gives the spiral its open "gap".
function wordChance(angle: number, ring: number) {
  const center = (13 * Math.PI) / 12 + ring * 0.07;
  let distance = Math.abs((((angle % TAU) + TAU) % TAU) - (center % TAU));
  if (distance > Math.PI) distance = TAU - distance;
  const t = Math.min(1, distance / (Math.PI * 0.62));
  return 0.03 + t * t * 0.97;
}

function layout(words: string[], width: number, height: number) {
  const tokens = words.flatMap((word) => word.toUpperCase().split(/\s+/)).filter(Boolean);
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure || tokens.length === 0) return [];
  const random = seeded(7);
  const short = Math.min(width, height);
  const base = Math.max(7, Math.min(10, short * 0.011)) * 1.05;
  const gap = short * 0.029;
  const limit = Math.hypot(width, height) / 2 + base * 2;
  const rings: Ring[] = [];
  let radius = Math.max(base * 1.05, short * 0.045);
  let token = 0;
  let letter = 0;
  let separate = false;

  for (let index = 0; radius < limit && index < 120; index += 1) {
    const size = Math.min(base * 1.05 ** index, base * 1.65);
    measure.font = `${size}px ${MONO}`;
    const step = (char: string) => Math.max(0.035, (measure.measureText(char).width * 1.12) / Math.max(radius, 1));
    const glyphs: Glyph[] = [];
    let angle = (index * 0.55) % TAU;
    const end = angle + TAU;

    while (angle < end) {
      const word = tokens[token % tokens.length];
      let char = DOT;
      if (letter > 0) {
        char = word[letter] ?? DOT;
        letter += 1;
        if (letter >= word.length) {
          letter = 0;
          token += 1;
          separate = true;
        }
      } else if (separate) {
        separate = false;
      } else {
        const span = [...word].reduce((sum, c) => sum + step(c), 0);
        if (span <= end - angle && random() < wordChance(angle, index)) {
          char = word[0];
          letter = word.length > 1 ? 1 : 0;
          if (letter === 0) {
            token += 1;
            separate = true;
          }
        }
      }
      const advance = step(char);
      if (angle + advance * 0.5 > end) break;
      glyphs.push({ char, angle });
      angle += advance;
    }

    rings.push({ radius, size, direction: index % 2 === 0 ? 1 : -1, glyphs });
    radius += gap;
  }
  return rings;
}

export function TextSpiral({ words, className = "" }: { words: string[]; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const key = words.join("|");

  useEffect(() => {
    const box = host.current;
    const surface = canvas.current;
    const ctx = surface?.getContext("2d");
    if (!box || !surface || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let rings: Ring[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let visible = true;
    const started = performance.now();

    const draw = (now: number) => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const turn = reduced.matches ? 0 : ((now - started) / 1000 / SPIN_SECONDS) * TAU;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, surface.width, surface.height);
      ctx.fillStyle = getComputedStyle(box).color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cx = width / 2;
      const cy = height / 2;
      for (const ring of rings) {
        ctx.font = `${ring.size}px ${MONO}`;
        const offset = turn * ring.direction;
        for (const glyph of ring.glyphs) {
          const angle = glyph.angle + offset;
          const cos = Math.cos(angle + Math.PI / 2);
          const sin = Math.sin(angle + Math.PI / 2);
          ctx.globalAlpha = glyph.char === DOT ? 0.45 : 1;
          ctx.setTransform(
            cos * scale,
            sin * scale,
            -sin * scale,
            cos * scale,
            (cx + Math.cos(angle) * ring.radius) * scale,
            (cy + Math.sin(angle) * ring.radius) * scale,
          );
          ctx.fillText(glyph.char, 0, 0);
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      frame = 0;
      if (now - last >= FRAME_MS) {
        last = now;
        draw(now);
      }
      schedule();
    };

    function schedule() {
      if (frame || reduced.matches || !visible || document.visibilityState === "hidden") return;
      frame = window.requestAnimationFrame(tick);
    }

    const rebuild = () => {
      const rect = box.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      surface.width = Math.round(width * scale);
      surface.height = Math.round(height * scale);
      rings = layout(key.split("|"), width, height);
      draw(performance.now());
      schedule();
    };

    const resize = new ResizeObserver(rebuild);
    resize.observe(box);
    rebuild();
    const seen = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      schedule();
    });
    seen.observe(box);
    const onVisibility = () => schedule();
    const onMotion = () => {
      draw(performance.now());
      schedule();
    };
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onMotion);

    return () => {
      window.cancelAnimationFrame(frame);
      resize.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onMotion);
    };
  }, [key]);

  return (
    <div ref={host} aria-hidden className={`overflow-hidden text-on-dark ${className}`}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
