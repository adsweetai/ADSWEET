"use client";

export interface Uploaded {
  id: string | null;
  name: string;
  kind: "foto" | "video";
  url: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
}

/** Leest de afmetingen (en lengte van een video) in de browser, voor de controle vóór het opladen. */
export function measure(file: File): Promise<{ width: number | null; height: number | null; duration: number | null }> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const done = (v: { width: number | null; height: number | null; duration: number | null }) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () =>
        done({ width: v.videoWidth || null, height: v.videoHeight || null, duration: Number.isFinite(v.duration) ? Math.round(v.duration) : null });
      v.onerror = () => done({ width: null, height: null, duration: null });
      v.src = url;
    } else {
      const img = new Image();
      img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight, duration: null });
      img.onerror = () => done({ width: null, height: null, duration: null });
      img.src = url;
    }
  });
}

/** Laadt een bestand op naar de bibliotheek (Supabase Storage, of .demo-storage in de demomodus). */
export async function upload(file: File): Promise<Uploaded> {
  const dims = await measure(file);
  const form = new FormData();
  form.set("file", file);
  if (dims.width) form.set("width", String(dims.width));
  if (dims.height) form.set("height", String(dims.height));
  if (dims.duration) form.set("duration", String(dims.duration));
  const res = await fetch("/api/media", { method: "POST", body: form });
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { id: string; name: string; kind: "foto" | "video"; url: string };
  return { id: data.id, name: data.name, kind: data.kind, url: data.url, ...dims };
}

/** "geschenkdoos-gaat-open.mp4" → "Geschenkdoos gaat open" */
export function nameFromFile(file: string) {
  const base = file
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^[0-9a-f-]{36}-/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return base ? base[0].toUpperCase() + base.slice(1) : file;
}
