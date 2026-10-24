import { NextResponse, type NextRequest } from "next/server";
import { must } from "@adsweet/db";
import { currentUser, getDb } from "@/lib/server/auth";
import { contentTypeOf, openFile } from "@/lib/server/storage";

/** Toont een opgeladen beeld. RLS bepaalt of je het mag zien. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 404 });
  const db = await getDb();
  const m = must(await db.from("media").select("id, storage_path").eq("id", id).maybeSingle());
  if (!m?.storage_path) return new NextResponse(null, { status: 404 });
  const file = await openFile("media", m.storage_path);
  if (!file) return new NextResponse(null, { status: 404 });
  if ("url" in file) return NextResponse.redirect(file.url);
  return new NextResponse(new Uint8Array(file.body), {
    headers: { "content-type": contentTypeOf(m.storage_path), "cache-control": "private, max-age=3600" },
  });
}
