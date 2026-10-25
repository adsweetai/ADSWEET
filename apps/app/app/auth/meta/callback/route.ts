import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { currentUser, safeNext } from "@/lib/server/auth";
import { META_STATE_COOKIE, exchangeCode } from "@/lib/server/meta/oauth";
import { saveUserMetaToken } from "@/lib/server/meta/tokens";

/**
 * Terug uit het venster van Meta: de code omwisselen voor een sleutel en die bewaren. Daarna terug naar waar je
 * vandaan kwam, met ?meta=ok, ?meta=perm als je geen toegang gaf of ?meta=fout als iets anders misliep.
 */
export async function GET(req: NextRequest) {
  const store = await cookies();
  const [state, next] = (store.get(META_STATE_COOKIE)?.value ?? "").split("|");
  store.delete(META_STATE_COOKIE);
  const back = new URL(safeNext(next, "/instellingen/koppelingen"), req.nextUrl.origin);
  const user = await currentUser();
  const code = req.nextUrl.searchParams.get("code");
  if (!user || !state || state !== req.nextUrl.searchParams.get("state") || !code) {
    back.searchParams.set("meta", "perm");
    return NextResponse.redirect(back);
  }
  try {
    const answer = await exchangeCode(code, `${env.appUrl}/auth/meta/callback`);
    await saveUserMetaToken(user.id, answer.token, answer.expiresIn);
    back.searchParams.set("meta", "ok");
  } catch (e) {
    console.warn(`Koppelen met Facebook mislukt: ${(e as Error).message}`);
    back.searchParams.set("meta", "fout");
  }
  return NextResponse.redirect(back);
}
