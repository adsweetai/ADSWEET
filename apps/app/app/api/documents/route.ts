import { NextResponse, type NextRequest } from "next/server";
import { must } from "@adsweet/db";
import { currentUser, getDb } from "@/lib/server/auth";
import { getContext } from "@/lib/server/context";
import { MAX_UPLOAD_BYTES, storeFile } from "@/lib/server/storage";

const CATEGORIES = ["prijs", "reviews", "resultaten", "anders", "brandguide", "logo"] as const;
type Category = (typeof CATEGORIES)[number];

/** Documenten, de brandguide en het logo opladen (onboardingpaneel en instellingen). */
export async function POST(req: NextRequest) {
  if (!(await currentUser())) return NextResponse.json({ error: "niet ingelogd" }, { status: 401 });
  const ctx = await getContext();
  if (!ctx.canEdit) return NextResponse.json({ error: "geen rechten" }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  const category = String(form.get("category") ?? "") as Category;
  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: "categorie" }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "geen bestand" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "te groot" }, { status: 413 });
  const bucket = category === "brandguide" || category === "logo" ? "brand" : "documents";
  const path = await storeFile(bucket, ctx.org.id, file);
  const db = await getDb();
  if (category === "logo") {
    await db.from("business_profiles").update({ logo_path: path }).eq("organization_id", ctx.org.id);
    return NextResponse.json({ ok: true, name: file.name });
  }
  const row = must(
    await db
      .from("documents")
      .insert({ organization_id: ctx.org.id, category, name: file.name.slice(0, 200), storage_path: path, status: "nieuw" })
      .select()
      .single(),
  );
  return NextResponse.json({ ok: true, id: row.id, name: row.name, category: row.category });
}
