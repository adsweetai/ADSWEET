import { NextResponse } from "next/server";
import { slug } from "@/lib/naming";
import { today } from "@/lib/clock";
import { currentUser } from "@/lib/server/auth";
import { getContext } from "@/lib/server/context";
import { exportData } from "@/lib/server/settings";

/** Privacy en gegevens › Je gegevens downloaden: alles wat AdSweet over je zaak bewaart, als JSON-bestand. */
export async function GET() {
  if (!(await currentUser())) return new NextResponse(null, { status: 401 });
  const ctx = await getContext();
  if (!ctx.canEdit) return new NextResponse(null, { status: 403 });
  const data = await exportData(ctx);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="adsweet-${slug(ctx.org.name) || "gegevens"}-${today()}.json"`,
      "cache-control": "no-store",
    },
  });
}
