import { NextResponse, type NextRequest } from "next/server";
import { signOut } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  await signOut();
  const url = req.nextUrl.clone();
  url.pathname = "/inloggen";
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
