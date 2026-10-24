import { NextResponse, type NextRequest } from "next/server";
import { logout } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  await logout();
  return NextResponse.redirect(new URL("/inloggen", req.url), { status: 303 });
}
