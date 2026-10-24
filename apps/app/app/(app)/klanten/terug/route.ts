import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ACCOUNT_COOKIE, getContext, ORG_COOKIE } from "@/lib/server/context";

/** Agency: terug van een klant naar het bureau. */
export async function POST(req: NextRequest) {
  const ctx = await getContext();
  const store = await cookies();
  if (ctx.agency) store.set(ORG_COOKIE, ctx.agency.id, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 31_536_000 });
  store.delete(ACCOUNT_COOKIE);
  const url = req.nextUrl.clone();
  url.pathname = "/klanten";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
