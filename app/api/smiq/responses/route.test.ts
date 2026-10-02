import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

function makeSelectBuilder(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

const mockDb = {
  select: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/lib/api-auth", () => ({
  requireApiAuth: vi.fn(),
}));

import { GET } from "@/app/api/smiq/responses/route";
import { requireApiAuth } from "@/lib/api-auth";
import { getDb } from "@/lib/db";

function makeRequest() {
  return new NextRequest("https://smiq.example.com/api/smiq/responses");
}

describe("GET /api/smiq/responses", () => {
  it("returns the auth helper's response unchanged and never queries the db when unauthorized", async () => {
    const unauthorizedResponse = Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
    vi.mocked(requireApiAuth).mockResolvedValue(unauthorizedResponse);

    const res = await GET(makeRequest());

    expect(res).toBe(unauthorizedResponse);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns 200 with the queried rows when authorized", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(null);
    const rows = [{ id: 1, name: "Jane Doe", email: "jane@example.com" }];
    mockDb.select.mockReturnValue(makeSelectBuilder(rows));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, count: 1, responses: rows });
  });

  it("returns 500 when getDb throws", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(null);
    vi.mocked(getDb).mockImplementationOnce(() => {
      throw new Error("DATABASE_URL environment variable is not set");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ ok: false, error: "Something went wrong" });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns 500 when the query rejects", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(null);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error("connection failed")),
        }),
      }),
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ ok: false, error: "Something went wrong" });
    errorSpy.mockRestore();
  });
});
