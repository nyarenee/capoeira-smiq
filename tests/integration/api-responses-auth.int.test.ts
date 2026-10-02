import { describe, it, expect } from "vitest";
import { STAGING_URL, STAGING_API_AUTH_TOKEN } from "../support/staging-env";
import { SEGMENTS } from "@/lib/reference-data";

// Covers the auth boundary of GET /api/smiq/responses against the real
// deployed staging Worker. The no-header-401 and valid-token-200 cases are
// already covered by scripts/smoke-test.ts — this extends rather than
// duplicates that, with the malformed-scheme/wrong-token cases plus a
// deeper row-shape assertion against the Drizzle schema.

const VALID_SEGMENT_CODES = new Set<string>(SEGMENTS.map((s) => s.code));

describe("GET /api/smiq/responses auth boundary (staging)", () => {
  it("rejects a non-Bearer Authorization scheme", async () => {
    const res = await fetch(`${STAGING_URL}/api/smiq/responses`, {
      headers: { Authorization: "Basic dGVzdDp0ZXN0" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects a Bearer token that doesn't match", async () => {
    const res = await fetch(`${STAGING_URL}/api/smiq/responses`, {
      headers: { Authorization: "Bearer not-the-real-token" },
    });
    expect(res.status).toBe(401);
  });

  it("accepts the real token and returns rows matching the Drizzle schema shape", async () => {
    const res = await fetch(`${STAGING_URL}/api/smiq/responses`, {
      headers: { Authorization: `Bearer ${STAGING_API_AUTH_TOKEN}` },
    });
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      ok: boolean;
      count: number;
      responses: Array<{
        id: number;
        createdAt: string;
        segment: string | null;
      }>;
    };

    expect(json.ok).toBe(true);
    expect(typeof json.count).toBe("number");
    expect(Array.isArray(json.responses)).toBe(true);

    for (const row of json.responses) {
      expect(typeof row.id).toBe("number");
      expect(Number.isNaN(Date.parse(row.createdAt))).toBe(false);
      if (row.segment !== null) {
        expect(VALID_SEGMENT_CODES.has(row.segment)).toBe(true);
      }
    }
  });
});
