import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubmitPayload } from "@/lib/validate-smiq-payload";

function makeDeleteBuilder(returningRows: unknown[] = []) {
  const whereResult = Object.assign(Promise.resolve(undefined), {
    returning: vi.fn().mockResolvedValue(returningRows),
  });
  return { where: vi.fn().mockReturnValue(whereResult) };
}

function makeInsertBuilder() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

const mockDb = {
  delete: vi.fn(),
  insert: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

let headerValue: string | null = "1.2.3.4";
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => (key === "cf-connecting-ip" ? headerValue : null),
  })),
}));

const capturedAfterCallbacks: Array<() => unknown> = [];
vi.mock("next/server", () => ({
  after: vi.fn((cb: () => unknown) => {
    capturedAfterCallbacks.push(cb);
  }),
}));

vi.mock("@/lib/kit", () => ({ subscribeToKit: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendConfirmationEmail: vi.fn(),
  sendOwnerNotification: vi.fn(),
}));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken: vi.fn() }));

import { submitResponse, confirmResponse } from "@/app/intelligence/actions";
import { pendingSmiqSubmissions, smiqResponses } from "@/db/schema";
import { subscribeToKit } from "@/lib/kit";
import { sendConfirmationEmail, sendOwnerNotification } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";

const basePayload: SubmitPayload = {
  segment: "curious",
  smiqAnswer: "some answer",
  teachingRole: null,
  graduationLevel: null,
  name: "Jane Doe",
  email: "jane@example.com",
  lang: "en",
  turnstileToken: "token",
};

function payload(overrides: Partial<SubmitPayload>): SubmitPayload {
  return { ...basePayload, ...overrides };
}

const pendingRow = {
  id: 1,
  createdAt: new Date("2026-03-15T00:00:00Z"),
  expiresAt: new Date("2026-03-16T00:00:00Z"),
  token: "fixed-token",
  name: "Jane Doe",
  email: "jane@example.com",
  segment: "teacher",
  smiqAnswer: "some answer",
  teachingRole: "classes",
  graduationLevel: "monitor",
  lang: "en",
};

describe("app/smiq/actions", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://test");
    headerValue = "1.2.3.4";
    capturedAfterCallbacks.length = 0;

    mockDb.delete.mockReset().mockReturnValue(makeDeleteBuilder());
    mockDb.insert.mockReset().mockReturnValue(makeInsertBuilder());

    vi.mocked(verifyTurnstileToken).mockReset().mockResolvedValue(true);
    vi.mocked(sendConfirmationEmail).mockReset().mockResolvedValue(undefined);
    vi.mocked(sendOwnerNotification).mockReset().mockResolvedValue(undefined);
    vi.mocked(subscribeToKit).mockReset().mockResolvedValue(undefined);

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "fixed-token" as ReturnType<typeof crypto.randomUUID>
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("submitResponse", () => {
    it("returns the validation error for an invalid payload without touching db/turnstile", async () => {
      const result = await submitResponse(payload({ segment: "" }));

      expect(result).toEqual({ ok: false, error: "Please fill in all required fields." });
      expect(verifyTurnstileToken).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("returns the temporarily-unavailable error when DATABASE_URL is unset", async () => {
      vi.stubEnv("DATABASE_URL", undefined);

      const result = await submitResponse(payload({}));

      expect(result).toEqual({
        ok: false,
        error: "Submission is temporarily unavailable. Please try again later.",
      });
      expect(verifyTurnstileToken).not.toHaveBeenCalled();
    });

    it("returns a verification-failed error when the turnstile token is rejected", async () => {
      vi.mocked(verifyTurnstileToken).mockResolvedValue(false);

      const result = await submitResponse(payload({}));

      expect(result).toEqual({ ok: false, error: "Verification failed. Please try again." });
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it("passes the cf-connecting-ip header as remoteip to verifyTurnstileToken", async () => {
      headerValue = "9.9.9.9";

      await submitResponse(payload({}));

      expect(verifyTurnstileToken).toHaveBeenCalledWith("token", "9.9.9.9");
    });

    it("passes undefined remoteip when the header is missing", async () => {
      headerValue = null;

      await submitResponse(payload({}));

      expect(verifyTurnstileToken).toHaveBeenCalledWith("token", undefined);
    });

    it("deletes expired rows, inserts a pending row, sends the confirmation email, and returns ok", async () => {
      const result = await submitResponse(
        payload({ segment: "teacher", teachingRole: "classes", graduationLevel: "monitor" })
      );

      expect(mockDb.delete).toHaveBeenCalledWith(pendingSmiqSubmissions);
      expect(mockDb.insert).toHaveBeenCalledWith(pendingSmiqSubmissions);
      const insertedValues = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(insertedValues).toMatchObject({
        token: "fixed-token",
        segment: "teacher",
        smiqAnswer: "some answer",
        teachingRole: "classes",
        graduationLevel: "monitor",
        name: "Jane Doe",
        email: "jane@example.com",
        lang: "en",
      });
      expect(insertedValues.expiresAt).toBeInstanceOf(Date);

      expect(sendConfirmationEmail).toHaveBeenCalledWith({
        name: "Jane Doe",
        email: "jane@example.com",
        token: "fixed-token",
        lang: "en",
      });
      expect(result).toEqual({ ok: true, pendingEmail: "jane@example.com" });
    });

    it("returns the generic failure and logs when the db insert rejects", async () => {
      mockDb.insert.mockReturnValue({ values: vi.fn().mockRejectedValue(new Error("db down")) });

      const result = await submitResponse(payload({}));

      expect(result).toEqual({ ok: false, error: "Something went wrong. Please try again." });
      expect(console.error).toHaveBeenCalled();
    });

    it("returns the generic failure when sendConfirmationEmail rejects", async () => {
      vi.mocked(sendConfirmationEmail).mockRejectedValue(new Error("resend down"));

      const result = await submitResponse(payload({}));

      expect(result).toEqual({ ok: false, error: "Something went wrong. Please try again." });
    });
  });

  describe("confirmResponse", () => {
    it("returns ok:false immediately for an empty token without calling getDb", async () => {
      const result = await confirmResponse("");

      expect(result).toEqual({ ok: false });
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("returns ok:false when no matching non-expired pending row is found", async () => {
      mockDb.delete.mockReturnValue(makeDeleteBuilder([]));

      const result = await confirmResponse("some-token");

      expect(result).toEqual({ ok: false });
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(capturedAfterCallbacks).toHaveLength(0);
    });

    it("inserts into smiqResponses with the pending row's fields and returns ok:true", async () => {
      mockDb.delete.mockReturnValue(makeDeleteBuilder([pendingRow]));

      const result = await confirmResponse("some-token");

      expect(mockDb.insert).toHaveBeenCalledWith(smiqResponses);
      const insertedValues = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(insertedValues).toEqual({
        segment: pendingRow.segment,
        smiqAnswer: pendingRow.smiqAnswer,
        teachingRole: pendingRow.teachingRole,
        graduationLevel: pendingRow.graduationLevel,
        name: pendingRow.name,
        email: pendingRow.email,
        lang: pendingRow.lang,
      });
      expect(result).toEqual({ ok: true });
    });

    it("schedules subscribeToKit and sendOwnerNotification via after()", async () => {
      mockDb.delete.mockReturnValue(makeDeleteBuilder([pendingRow]));

      await confirmResponse("some-token");
      expect(capturedAfterCallbacks).toHaveLength(2);

      await Promise.all(capturedAfterCallbacks.map((cb) => cb()));

      expect(subscribeToKit).toHaveBeenCalledWith({
        name: pendingRow.name,
        email: pendingRow.email,
        segment: pendingRow.segment,
        teachingRole: pendingRow.teachingRole,
        graduationLevel: pendingRow.graduationLevel,
        lang: pendingRow.lang,
      });
      expect(sendOwnerNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          name: pendingRow.name,
          email: pendingRow.email,
          segment: pendingRow.segment,
          smiqAnswer: pendingRow.smiqAnswer,
          teachingRole: pendingRow.teachingRole,
          graduationLevel: pendingRow.graduationLevel,
          lang: pendingRow.lang,
          createdAt: expect.any(Date),
        })
      );
    });

    it("swallows a subscribeToKit rejection via .catch(console.error)", async () => {
      mockDb.delete.mockReturnValue(makeDeleteBuilder([pendingRow]));
      vi.mocked(subscribeToKit).mockRejectedValue(new Error("kit down"));

      await confirmResponse("some-token");
      await expect(Promise.all(capturedAfterCallbacks.map((cb) => cb()))).resolves.toBeDefined();

      expect(console.error).toHaveBeenCalledWith("[kit]", expect.any(Error));
    });

    it("swallows a sendOwnerNotification rejection via .catch(console.error)", async () => {
      mockDb.delete.mockReturnValue(makeDeleteBuilder([pendingRow]));
      vi.mocked(sendOwnerNotification).mockRejectedValue(new Error("resend down"));

      await confirmResponse("some-token");
      await expect(Promise.all(capturedAfterCallbacks.map((cb) => cb()))).resolves.toBeDefined();

      expect(console.error).toHaveBeenCalledWith("[email:owner-notification]", expect.any(Error));
    });

    it("returns ok:false and logs the pending row when the smiqResponses insert fails", async () => {
      mockDb.delete.mockReturnValue(makeDeleteBuilder([pendingRow]));
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error("insert failed")),
      });

      const result = await confirmResponse("some-token");

      expect(result).toEqual({ ok: false });
      expect(console.error).toHaveBeenCalledWith(
        "Failed to confirm SMIQ submission",
        expect.any(Error),
        pendingRow
      );
      expect(capturedAfterCallbacks).toHaveLength(0);
    });
  });
});
