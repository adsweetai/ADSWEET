import { NextResponse, type NextRequest } from "next/server";
import { must } from "@adsweet/db";
import { currentUser, getDb } from "@/lib/server/auth";
import { openFile } from "@/lib/server/storage";

/** Een factuur als PDF. Alleen de eigenaar ziet facturen (RLS). De PDF komt van de betaalpartner (fase 13). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 404 });
  const db = await getDb();
  const inv = must(await db.from("invoices").select("id, number, pdf_path").eq("id", id).maybeSingle());
  if (!inv?.pdf_path) return new NextResponse(null, { status: 404 });
  const file = await openFile("documents", inv.pdf_path);
  if (!file) return new NextResponse(null, { status: 404 });
  if ("url" in file) return NextResponse.redirect(file.url);
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="factuur-${inv.number.replace(/[^\w-]/g, "")}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
