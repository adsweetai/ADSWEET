import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runDailyMails } from "@/lib/server/mail-jobs";
import { metaLive } from "@/lib/server/meta/connect";
import { syncAllMeta } from "@/lib/server/meta/sync";

export const maxDuration = 60;

// De dagelijkse taak (Vercel Cron of Supabase Cron, 06:00 Europe/Brussels): cijfers uit Meta en de mails. Vercel stuurt "Authorization: Bearer
// CRON_SECRET". Zonder geheim draait de taak niet. ?week=1 stuurt het weekrapport ook op een andere dag.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok = !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return new NextResponse(null, { status: 401 });
  // Eerst de cijfers van de laatste 3 dagen uit Meta (late conversies tellen nog mee), dan de mails.
  const meta = metaLive() ? await syncAllMeta(3) : null;
  const mails = await runDailyMails({ weekly: req.nextUrl.searchParams.get("week") === "1" ? true : undefined });
  return NextResponse.json({ meta, mails });
}
