import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { currentUser, safeNext } from "@/lib/server/auth";
import { META_STATE_COOKIE, dialogUrl, oauthReady } from "@/lib/server/meta/oauth";

/** Doorgaan met Facebook voor de koppeling: naar het venster van Meta. Je komt terug op /auth/meta/callback. */
export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next"), "/instellingen/koppelingen");
  if (!(await currentUser())) return NextResponse.redirect(new URL(`/inloggen?next=${encodeURIComponent(next)}`, req.nextUrl.origin));
  if (!oauthReady()) {
    const back = new URL(next, req.nextUrl.origin);
    back.searchParams.set("meta", "fout");
    return NextResponse.redirect(back);
  }
  const state = randomBytes(16).toString("hex");
  (await cookies()).set(META_STATE_COOKIE, `${state}|${next}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appUrl.startsWith("https"),
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(dialogUrl(state, `${env.appUrl}/auth/meta/callback`));
}
