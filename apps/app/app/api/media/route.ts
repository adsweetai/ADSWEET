import { NextResponse, type NextRequest } from "next/server";
import { must } from "@adsweet/db";
import { currentUser, getDb } from "@/lib/server/auth";
import { getContext } from "@/lib/server/context";
import { MAX_UPLOAD_BYTES, storeFile } from "@/lib/server/storage";

/** Een beeld of video opladen naar de bibliotheek. De browser geeft de afmetingen mee voor de controle. */
export async function POST(req: NextRequest) {
  if (!(await currentUser())) return NextResponse.json({ error: "niet ingelogd" }, { status: 401 });
  const ctx = await getContext();
  if (!ctx.canEdit) return NextResponse.json({ error: "geen rechten" }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "geen bestand" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "te groot" }, { status: 413 });
  const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "foto" : null;
  if (!kind) return NextResponse.json({ error: "soort" }, { status: 415 });
  const num = (k: string) => {
    const v = Number(form.get(k));
    return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  };
  const path = await storeFile("media", ctx.org.id, file);
  const db = await getDb();
  const row = must(
    await db
      .from("media")
      .insert({
        organization_id: ctx.org.id,
        name: file.name.slice(0, 200),
        storage_path: path,
        kind,
        source: "upload",
        width: num("width"),
        height: num("height"),
        duration_s: num("duration"),
      })
      .select()
      .single(),
  );
  return NextResponse.json({ id: row.id, name: row.name, kind: row.kind, url: `/api/media/${row.id}` });
}
