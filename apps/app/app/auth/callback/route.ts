import { NextResponse, type NextRequest } from "next/server";
import { completeLogin } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const { ok, next } = await completeLogin(req.nextUrl.searchParams);
  const url = req.nextUrl.clone();
  url.search = "";
  url.pathname = ok ? next : "/inloggen";
  if (!ok) url.searchParams.set("fout", "link");
  return NextResponse.redirect(url);
}
