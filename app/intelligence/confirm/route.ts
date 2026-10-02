import { NextRequest, NextResponse } from "next/server";
import { confirmResponse } from "@/app/intelligence/actions";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = await confirmResponse(token);

  if (!result.ok) {
    return NextResponse.redirect(new URL("/intelligence/confirmed?expired=1", req.url));
  }

  return NextResponse.redirect(new URL("/intelligence/confirmed", req.url));
}
