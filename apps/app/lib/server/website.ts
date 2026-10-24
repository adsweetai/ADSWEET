import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { DEMO_SITES, type DemoSite } from "./demo-sites";

// "Lees mijn website": haalt de pagina op en leest wat er zonder AI te vinden is (naam, beschrijving, kleuren,
// beelden, contact). Toon en voorbeeldzin schrijft Claude vanaf fase 13; tot dan blijven ze plaatshouders.
// De voorbeeldsites (*.voorbeeld) uit de demo geven de gegevens uit het prototype terug.

export interface Found {
  site: string;
  name: string;
  logo: string;
  colors: string[];
  sells: string;
  sellsSub: string | null;
  offers: { name: string; price: string }[];
  tone: string[];
  toneExample: string | null;
  images: string[];
  imageCount: number;
  contact: string;
  region: string | null;
  demo: DemoSite | null;
}

const TIMEOUT_MS = 8000;
const MAX_BYTES = 1_500_000;

export function normalizeSite(input: string): string | null {
  const raw = input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  if (!raw || raw.length > 200 || /\s/.test(raw)) return null;
  const host = raw.split("/")[0].toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return null;
  return raw.toLowerCase();
}

/** Geen interne adressen ophalen (localhost, privé-netwerken, metadata van de cloud). */
function isPrivate(ip: string): boolean {
  if (isIP(ip) === 6) {
    const l = ip.toLowerCase();
    if (l.startsWith("::ffff:")) return isPrivate(l.slice(7));
    return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

async function safeHost(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const addrs = await lookup(url.hostname, { all: true }).catch(() => []);
  return addrs.length > 0 && !addrs.some((a) => isPrivate(a.address));
}

/** Haalt de pagina op. Doorverwijzingen volgen we zelf, zodat ook die niet naar een intern adres kunnen. */
async function fetchPage(site: string): Promise<{ html: string; base: string } | null> {
  let url = new URL(`https://${site}`);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    for (let hop = 0; hop < 4; hop++) {
      if (!(await safeHost(url))) return null;
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: "manual",
        headers: { "user-agent": "AdSweet/1.0 (+https://adsweet.ai)", accept: "text/html" },
      });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        url = new URL(loc, url);
        continue;
      }
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return null;
      const buf = await res.arrayBuffer();
      return { html: new TextDecoder().decode(buf.slice(0, MAX_BYTES)), base: url.toString() };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function meta(html: string, key: string) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag ? decode(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "") : "";
}

export async function readWebsite(input: string): Promise<Found | null> {
  const site = normalizeSite(input);
  if (!site) return null;
  const demo = DEMO_SITES[site.split("/")[0]];
  if (demo) return { site, ...demo.found, demo };

  const page = await fetchPage(site);
  if (!page) return null;
  const { html, base } = page;
  const title = decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "");
  const name = meta(html, "og:site_name") || title.split(/[|·–-]/)[0].trim() || site.split("/")[0];
  const sells = meta(html, "description") || meta(html, "og:description");
  const theme = meta(html, "theme-color");
  const abs = (src: string) => {
    try {
      const u = new URL(src, base);
      return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
    } catch {
      return null;
    }
  };
  const og = meta(html, "og:image");
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]).filter((s) => !/\.svg(\?|$)|data:|sprite|icon|logo|pixel/i.test(s));
  const images = [
    ...new Set(
      [og, ...imgs]
        .filter(Boolean)
        .map(abs)
        .filter((x): x is string => !!x),
    ),
  ].slice(0, 12);
  const phone = decode(html.match(/href=["']tel:([^"']+)["']/i)?.[1] ?? "");
  const email = decode(html.match(/href=["']mailto:([^"'?]+)/i)?.[1] ?? "");
  return {
    site,
    name,
    logo: name.slice(0, 1).toUpperCase(),
    colors: /^#[0-9a-f]{3,8}$/i.test(theme) ? [theme] : [],
    sells,
    sellsSub: null,
    offers: [],
    tone: [],
    toneExample: null,
    images,
    imageCount: images.length,
    contact: [phone, email].filter(Boolean).join(" · ") || "[contact]",
    region: null,
    demo: null,
  };
}
