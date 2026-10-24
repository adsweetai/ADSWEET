import { NextResponse, type NextRequest } from "next/server";
import { facebookSignInUrl } from "@/lib/server/auth";

/** Doorgaan met Facebook (Supabase Auth). In de demo kies je het antwoord van Meta in het venster zelf. */
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") ?? "/vandaag";
  const url = await facebookSignInUrl(next);
  if (url) return NextResponse.redirect(url);
  const back = req.nextUrl.clone();
  back.pathname = "/inloggen";
  back.search = "?fout=perm";
  return NextResponse.redirect(back);
}
