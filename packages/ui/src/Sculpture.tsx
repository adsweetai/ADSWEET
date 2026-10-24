"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./useTheme";

// Het Raakpunt als stilstaand beeld. Gebruikt de sculptuurbeelden als ze er zijn (public/sculptuur/...),
// anders de voorlopige sculptuur die hieronder getekend wordt: twee strengen die samenkomen in een robijnrode parel.
// De kleuren hieronder zijn beeldinhoud, geen interfacekleuren.

const FILES = {
  light: "/sculptuur/adsweet-sculptuur-licht.jpg",
  dark: "/sculptuur/adsweet-sculptuur-nacht.jpg",
  "light-p": "/sculptuur/adsweet-sculptuur-gsm-licht.jpg",
  "dark-p": "/sculptuur/adsweet-sculptuur-gsm-nacht.jpg",
} as const;

const fileOk: Record<string, boolean | undefined> = {};
const cache: Record<string, Promise<string> | undefined> = {};

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function makeSculpture(dark: boolean): string {
  const W = 2000;
  const H = 800;
  const cx = W / 2;
  const cy = H / 2;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return "";
  const R = rng(dark ? 11 : 7);
  const pal = dark
    ? [
        [244, 238, 226],
        [226, 211, 182],
        [205, 186, 150],
        [168, 160, 150],
        [250, 247, 240],
      ]
    : [
        [132, 116, 92],
        [168, 150, 120],
        [104, 98, 92],
        [196, 182, 156],
        [78, 72, 66],
      ];
  g.lineCap = "round";
  for (const side of [-1, 1]) {
    for (let i = 0; i < 1300; i++) {
      const phase = R() * Math.PI * 2;
      const twist = 1.25 + R() * 0.35;
      const x0 = cx + side * (W * (0.36 + R() * 0.1));
      const amp = 70 + R() * 120;
      const yoff = (R() - 0.5) * 60;
      const col = pal[Math.floor(R() * pal.length)];
      const steps = 70;
      g.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const env = Math.pow(1 - t, 0.85);
        const ang = phase + side * twist * t * Math.PI * 2;
        const x = x0 + (cx - x0) * t + side * Math.sin(ang * 0.5) * 14 * env;
        const y = cy + (Math.sin(ang) * amp + yoff) * env * (0.55 + 0.45 * Math.cos(t * Math.PI * 0.5));
        if (s) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      const shade = 0.75 + 0.25 * Math.cos(phase);
      g.strokeStyle = `rgba(${col.map((v) => Math.round(Math.min(255, v * shade))).join(",")},${dark ? 0.32 : 0.36})`;
      g.lineWidth = 0.7 + R() * 1.3;
      g.stroke();
    }
    for (let i = 0; i < 2600; i++) {
      const t = Math.pow(R(), 0.7);
      const x = cx + side * W * (0.28 + t * 0.17 + (R() - 0.5) * 0.05);
      const y = cy + (R() - 0.5) * (110 + t * 260) * (0.6 + R() * 0.4);
      if (Math.abs(x - cx) > W * 0.47 && R() < 0.85) continue;
      const col = pal[Math.floor(R() * pal.length)];
      const r = R() < 0.03 ? 3 + R() * 6 : 0.8 + R() * 1.6;
      if (r > 3) {
        const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
        gr.addColorStop(0, dark ? "rgba(255,252,246,.95)" : "rgba(250,247,240,.95)");
        gr.addColorStop(1, `rgba(${col.join(",")},.9)`);
        g.fillStyle = gr;
      } else g.fillStyle = `rgba(${col.join(",")},${0.35 + R() * 0.5})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  const br = 22;
  const gr = g.createRadialGradient(cx - br * 0.35, cy - br * 0.4, br * 0.1, cx, cy, br);
  gr.addColorStop(0, "#F58AA4");
  gr.addColorStop(0.35, "#D0284F");
  gr.addColorStop(1, "#7C0F2B");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(cx, cy, br, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,.75)";
  g.beginPath();
  g.ellipse(cx - 7, cy - 8, 6, 4, -0.6, 0, Math.PI * 2);
  g.fill();
  return c.toDataURL("image/png");
}

function procedural(dark: boolean, portrait: boolean): Promise<string> {
  const key = (dark ? "d" : "l") + (portrait ? "p" : "");
  const hit = cache[key];
  if (hit) return hit;
  const land = makeSculpture(dark);
  if (!portrait) return (cache[key] = Promise.resolve(land));
  return (cache[key] = new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = 800;
      c.height = 1000;
      const g = c.getContext("2d");
      if (!g) return res(land);
      g.translate(400, 500);
      g.rotate(Math.PI / 2);
      g.drawImage(im, -1000, -400, 2000, 800);
      res(c.toDataURL("image/png"));
    };
    im.src = land;
  }));
}

function resolveSrc(dark: boolean, portrait: boolean): Promise<string> {
  const f = FILES[`${dark ? "dark" : "light"}${portrait ? "-p" : ""}` as keyof typeof FILES];
  if (fileOk[f] === true) return Promise.resolve(f);
  if (fileOk[f] === false) return procedural(dark, portrait);
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      fileOk[f] = true;
      res(f);
    };
    im.onerror = () => {
      fileOk[f] = false;
      procedural(dark, portrait).then(res);
    };
    im.src = f;
  });
}

export interface SculptureProps {
  orient?: "landscape" | "portrait";
  alt?: string;
  className?: string;
}

/** De kleine, stilstaande sculptuur (inloggen, lege staten, 404). */
export function Sculpture({ orient = "landscape", alt = "", className }: SculptureProps) {
  const theme = useTheme();
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    resolveSrc(theme === "dark", orient === "portrait").then((s) => live && setSrc(s));
    return () => {
      live = false;
    };
  }, [theme, orient]);
  return (
    <span className={["as-sculpture", className].filter(Boolean).join(" ")}>
      {src ? <img src={src} alt={alt} aria-hidden={alt ? undefined : true} /> : null}
    </span>
  );
}
