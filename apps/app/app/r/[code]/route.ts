import { NextResponse, type NextRequest } from "next/server";
import { REF_COOKIE, referrerOf } from "@/lib/server/referral";

// Doorverwijslink: onthoudt de code 30 dagen en stuurt door naar Account maken. De website stuurt /r/[code] hierheen.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/account-maken", request.url));
  if (await referrerOf(code)) res.cookies.set(REF_COOKIE, code.toLowerCase(), { path: "/", sameSite: "lax", httpOnly: true, maxAge: 30 * 86_400 });
  return res;
}
