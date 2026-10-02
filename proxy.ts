import { NextResponse, type NextRequest } from "next/server";

// intelligence.capoeirainternational.com's root sends visitors straight to
// the SMIQ form instead of the landing page — www.capoeirainternational.com
// and the *.workers.dev URL still show the landing page at "/" as before.
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host === "intelligence.capoeirainternational.com") {
    return NextResponse.redirect(new URL("/smiq", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
