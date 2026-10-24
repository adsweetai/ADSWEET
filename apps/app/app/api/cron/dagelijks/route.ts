import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runDailyMails } from "@/lib/server/mail-jobs";

// De dagelijkse taak (Vercel Cron of Supabase Cron, 06:00 Europe/Brussels). Vercel stuurt "Authorization: Bearer
// CRON_SECRET". Zonder geheim draait de taak niet. ?week=1 stuurt het weekrapport ook op een andere dag.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok = !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return new NextResponse(null, { status: 401 });
  const res = await runDailyMails({ weekly: req.nextUrl.searchParams.get("week") === "1" ? true : undefined });
  return NextResponse.json(res);
}
