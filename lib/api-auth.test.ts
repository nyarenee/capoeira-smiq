import { afterEach, describe, expect, it, vi } from "vitest";
import { requireApiAuth } from "@/lib/api-auth";

function makeRequest(authorization?: string) {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return new Request("https://smiq.example.com/api/smiq/responses", {
    headers,
  });
}

describe("requireApiAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects with 401 and warns when API_AUTH_TOKEN is unset", async () => {
    vi.stubEnv("API_AUTH_TOKEN", undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await requireApiAuth(makeRequest("Bearer anything"));

    expect(res?.status).toBe(401);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("rejects with 401 when the Authorization header is missing", async () => {
    vi.stubEnv("API_AUTH_TOKEN", "secret-token");

    const res = await requireApiAuth(makeRequest());

    expect(res?.status).toBe(401);
  });

  it("rejects with 401 when the scheme is not Bearer", async () => {
    vi.stubEnv("API_AUTH_TOKEN", "secret-token");

    const res = await requireApiAuth(makeRequest("Basic secret-token"));

    expect(res?.status).toBe(401);
  });

  it("rejects with 401 when the token after the scheme is empty", async () => {
    vi.stubEnv("API_AUTH_TOKEN", "secret-token");

    const res = await requireApiAuth(makeRequest("Bearer "));

    expect(res?.status).toBe(401);
  });

  it("rejects with 401 when the token does not match", async () => {
    vi.stubEnv("API_AUTH_TOKEN", "secret-token");

    const res = await requireApiAuth(makeRequest("Bearer wrong-token"));

    expect(res?.status).toBe(401);
  });

  it("rejects a differently-cased token (case-sensitive comparison)", async () => {
    vi.stubEnv("API_AUTH_TOKEN", "secret-token");

    const res = await requireApiAuth(makeRequest("Bearer SECRET-TOKEN"));

    expect(res?.status).toBe(401);
  });

  it("returns null when the token matches", async () => {
    vi.stubEnv("API_AUTH_TOKEN", "secret-token");

    const res = await requireApiAuth(makeRequest("Bearer secret-token"));

    expect(res).toBeNull();
  });

  it("401 response body reports an error", async () => {
    vi.stubEnv("API_AUTH_TOKEN", "secret-token");

    const res = await requireApiAuth(makeRequest());
    const body = await res?.json();

    expect(body).toEqual({ ok: false, error: "Unauthorized" });
  });
});
