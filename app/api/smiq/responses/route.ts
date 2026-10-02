import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { smiqResponses } from "@/db/schema";

const MAX_RESULTS = 500;

export async function GET(req: NextRequest) {
  const unauthorized = await requireApiAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const db = getDb();
    const responses = await db
      .select()
      .from(smiqResponses)
      .orderBy(desc(smiqResponses.createdAt))
      .limit(MAX_RESULTS);

    return NextResponse.json({ ok: true, count: responses.length, responses });
  } catch (error) {
    console.error("[api/smiq/responses] failed to load responses", error);
    return NextResponse.json(
      { ok: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}
