import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import { isDemo } from "@/lib/env";
import { supabaseForRequest } from "./supabase";

// Bestanden van klanten: Supabase Storage (buckets documents, media en brand, met RLS per organisatie).
// In de demomodus komen ze in .demo-storage naast de app. Dat mapje staat in .gitignore.

export type Bucket = "documents" | "media" | "brand";

const DEMO_ROOT = join(process.cwd(), ".demo-storage");
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

const safeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-80) || "bestand";

/** Bewaart een bestand onder <organisatie>/<uuid>-<naam>. Geeft het pad terug. */
export async function storeFile(bucket: Bucket, orgId: string, file: File): Promise<string> {
  const path = `${orgId}/${randomUUID()}-${safeName(file.name)}`;
  if (isDemo) {
    const target = join(DEMO_ROOT, bucket, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await file.arrayBuffer()));
    return path;
  }
  const sb = await supabaseForRequest();
  const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Leest een bestand (demo) of geeft een tijdelijke link (Supabase). */
export async function openFile(bucket: Bucket, path: string): Promise<{ body: Buffer } | { url: string } | null> {
  if (isDemo) {
    const root = join(DEMO_ROOT, bucket);
    const target = normalize(join(root, path));
    if (!target.startsWith(root)) return null;
    try {
      return { body: await readFile(target) };
    } catch {
      return null;
    }
  }
  const sb = await supabaseForRequest();
  const { data } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ? { url: data.signedUrl } : null;
}

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  pdf: "application/pdf",
};
export const contentTypeOf = (path: string) => TYPES[path.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
