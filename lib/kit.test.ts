import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeToKit } from "@/lib/kit";

const KIT_API = "https://api.kit.com/v4";

function okResponse() {
  return { ok: true, status: 200, text: async () => "" };
}

function failResponse(status: number, body: string) {
  return { ok: false, status, text: async () => body };
}

const baseArgs = {
  name: "Jane Doe",
  email: "jane@example.com",
  segment: "teacher",
  teachingRole: null as string | null,
  graduationLevel: null as string | null,
  lang: null as string | null,
};

describe("subscribeToKit", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("skips entirely and warns when KIT_API_KEY is unset", async () => {
    vi.stubEnv("KIT_API_KEY", undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await subscribeToKit(baseArgs);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("POSTs the subscriber with correct URL, headers, and body", async () => {
    vi.stubEnv("KIT_API_KEY", "test-key");
    fetchMock.mockResolvedValue(okResponse());

    await subscribeToKit(baseArgs);

    expect(fetchMock).toHaveBeenCalledWith(
      `${KIT_API}/subscribers`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Kit-Api-Key": "test-key" },
        body: JSON.stringify({
          email_address: "jane@example.com",
          first_name: "Jane Doe",
          fields: { capoeira_segment: "teacher" },
        }),
      })
    );
  });

  it("makes no tag calls when role/grad/lang are all null", async () => {
    vi.stubEnv("KIT_API_KEY", "test-key");
    fetchMock.mockResolvedValue(okResponse());

    await subscribeToKit(baseArgs);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("resolves and POSTs the correct tag IDs for a full role+grad+lang combo", async () => {
    vi.stubEnv("KIT_API_KEY", "test-key");
    vi.stubEnv("KIT_TAG_ID_ROLE_CLASSES", "role-1");
    vi.stubEnv("KIT_TAG_ID_GRAD_MONITOR", "grad-1");
    vi.stubEnv("KIT_TAG_ID_LANG_EN", "lang-1");
    fetchMock.mockResolvedValue(okResponse());

    await subscribeToKit({
      ...baseArgs,
      teachingRole: "classes",
      graduationLevel: "monitor",
      lang: "en",
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const calledUrls = fetchMock.mock.calls.map((call) => call[0]).sort();
    expect(calledUrls).toEqual(
      [
        `${KIT_API}/subscribers`,
        `${KIT_API}/tags/role-1/subscribers`,
        `${KIT_API}/tags/grad-1/subscribers`,
        `${KIT_API}/tags/lang-1/subscribers`,
      ].sort()
    );
    for (const call of fetchMock.mock.calls) {
      if (call[0] !== `${KIT_API}/subscribers`) {
        expect(call[1].body).toBe(JSON.stringify({ email_address: "jane@example.com" }));
      }
    }
  });

  it("omits a tag whose mapped env var is unset", async () => {
    vi.stubEnv("KIT_API_KEY", "test-key");
    vi.stubEnv("KIT_TAG_ID_ROLE_CLASSES", undefined);
    vi.stubEnv("KIT_TAG_ID_GRAD_MONITOR", "grad-1");
    vi.stubEnv("KIT_TAG_ID_LANG_EN", "lang-1");
    fetchMock.mockResolvedValue(okResponse());

    await subscribeToKit({
      ...baseArgs,
      teachingRole: "classes",
      graduationLevel: "monitor",
      lang: "en",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const calledUrls = fetchMock.mock.calls.map((call) => call[0]).sort();
    expect(calledUrls).toEqual(
      [`${KIT_API}/subscribers`, `${KIT_API}/tags/grad-1/subscribers`, `${KIT_API}/tags/lang-1/subscribers`].sort()
    );
  });

  it("omits a tag for a code not present in the lookup map", async () => {
    vi.stubEnv("KIT_API_KEY", "test-key");
    fetchMock.mockResolvedValue(okResponse());

    await subscribeToKit({ ...baseArgs, teachingRole: "not-a-real-role" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the subscribe call is non-ok and never calls the tag endpoint", async () => {
    vi.stubEnv("KIT_API_KEY", "test-key");
    vi.stubEnv("KIT_TAG_ID_LANG_EN", "lang-1");
    fetchMock.mockResolvedValue(failResponse(422, "invalid email"));

    await expect(subscribeToKit({ ...baseArgs, lang: "en" })).rejects.toThrow(
      /subscribe failed 422: invalid email/
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when a tag call is non-ok", async () => {
    vi.stubEnv("KIT_API_KEY", "test-key");
    vi.stubEnv("KIT_TAG_ID_LANG_EN", "lang-1");
    fetchMock.mockImplementation(async (url: string) => {
      if (url === `${KIT_API}/subscribers`) return okResponse();
      return failResponse(500, "tag service down");
    });

    await expect(subscribeToKit({ ...baseArgs, lang: "en" })).rejects.toThrow(
      /tag lang-1 failed 500: tag service down/
    );
  });

  it("sends identical headers on every fetch call", async () => {
    vi.stubEnv("KIT_API_KEY", "test-key");
    vi.stubEnv("KIT_TAG_ID_LANG_EN", "lang-1");
    fetchMock.mockResolvedValue(okResponse());

    await subscribeToKit({ ...baseArgs, lang: "en" });

    for (const call of fetchMock.mock.calls) {
      expect(call[1].headers).toEqual({
        "Content-Type": "application/json",
        "X-Kit-Api-Key": "test-key",
      });
    }
  });
});
