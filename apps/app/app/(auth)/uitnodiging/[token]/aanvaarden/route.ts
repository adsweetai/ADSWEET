import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { acceptInvitation } from "@/lib/server/invitations";

/** Na het inloggen via de uitnodiging: lid worden en meteen naar Vandaag, met de rechten van je rol. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = req.nextUrl.clone();
  url.search = "";
  if (!(await currentUser())) {
    url.pathname = `/uitnodiging/${encodeURIComponent(token)}`;
    return NextResponse.redirect(url);
  }
  const ok = await acceptInvitation(token);
  url.pathname = ok ? "/vandaag" : `/uitnodiging/${encodeURIComponent(token)}`;
  return NextResponse.redirect(url);
}
