import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendConfirmationEmail, sendOwnerNotification } from "@/lib/email";

const { mockSend, mockGetTranslations } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetTranslations: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: mockSend } })),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: mockGetTranslations,
}));

function translator(overrides: Record<string, string> = {}) {
  return (key: string, vars?: Record<string, string>) => {
    if (overrides[key] !== undefined) return overrides[key];
    if (key === "greeting") return `Hi ${vars?.firstName}`;
    return key;
  };
}

describe("lib/email", () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({ data: { id: "test-id" }, error: null });
    mockGetTranslations.mockReset();
    mockGetTranslations.mockResolvedValue(translator());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("sendConfirmationEmail", () => {
    const baseArgs = { name: "Jane Doe", email: "jane@example.com", token: "tok-123", lang: "en" as string | null };

    it("calls getTranslations with the resolved locale and namespace", async () => {
      await sendConfirmationEmail(baseArgs);
      expect(mockGetTranslations).toHaveBeenCalledWith({ locale: "en", namespace: "email.confirm" });
    });

    it("resolves locale to \"en\" for an unsupported lang", async () => {
      await sendConfirmationEmail({ ...baseArgs, lang: "de" });
      expect(mockGetTranslations).toHaveBeenCalledWith({ locale: "en", namespace: "email.confirm" });
    });

    it("resolves locale to \"en\" for a null lang", async () => {
      await sendConfirmationEmail({ ...baseArgs, lang: null });
      expect(mockGetTranslations).toHaveBeenCalledWith({ locale: "en", namespace: "email.confirm" });
    });

    it("preserves a supported lang", async () => {
      await sendConfirmationEmail({ ...baseArgs, lang: "pt" });
      expect(mockGetTranslations).toHaveBeenCalledWith({ locale: "pt", namespace: "email.confirm" });
    });

    it("builds the confirm URL from NEXT_PUBLIC_APP_URL and the token", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://smiq.example.com");
      await sendConfirmationEmail(baseArgs);
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).toContain("https://smiq.example.com/smiq/confirm?token=tok-123");
    });

    it("falls back to localhost when NEXT_PUBLIC_APP_URL is unset", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);
      await sendConfirmationEmail(baseArgs);
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).toContain("http://localhost:3000/smiq/confirm?token=tok-123");
    });

    it("uses RESEND_FROM_EMAIL as from when set", async () => {
      vi.stubEnv("RESEND_FROM_EMAIL", "hello@capoeirainternational.com");
      await sendConfirmationEmail(baseArgs);
      expect(mockSend.mock.calls[0][0].from).toBe("hello@capoeirainternational.com");
    });

    it("defaults from to onboarding@resend.dev when unset", async () => {
      vi.stubEnv("RESEND_FROM_EMAIL", undefined);
      await sendConfirmationEmail(baseArgs);
      expect(mockSend.mock.calls[0][0].from).toBe("onboarding@resend.dev");
    });

    it("uses only the first word of name as the greeting firstName", async () => {
      await sendConfirmationEmail(baseArgs);
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).toContain("Hi Jane");
    });

    it("escapes HTML-significant characters in translator output", async () => {
      mockGetTranslations.mockResolvedValue(
        translator({ body: `<script>alert("x")</script> & 'quoted'` })
      );
      await sendConfirmationEmail(baseArgs);
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quoted&#39;");
      expect(html).not.toContain(`<script>alert("x")</script>`);
    });

    it("throws with the stringified error when emails.send returns an error", async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: "bad request" } });
      await expect(sendConfirmationEmail(baseArgs)).rejects.toThrow(
        /Resend error:.*bad request/
      );
    });
  });

  describe("sendOwnerNotification", () => {
    const baseArgs = {
      name: "Jane Doe",
      email: "jane@example.com",
      segment: "teacher",
      smiqAnswer: "some answer",
      teachingRole: "classes" as string | null,
      graduationLevel: "monitor" as string | null,
      lang: "en" as string | null,
      createdAt: new Date("2026-03-15T14:30:00Z"),
    };

    it("no-ops and warns when OWNER_NOTIFICATION_EMAIL is unset", async () => {
      vi.stubEnv("OWNER_NOTIFICATION_EMAIL", undefined);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await sendOwnerNotification(baseArgs);
      expect(mockSend).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("sends to OWNER_NOTIFICATION_EMAIL with the segment label in the subject", async () => {
      vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@example.com");
      await sendOwnerNotification(baseArgs);
      expect(mockSend.mock.calls[0][0].to).toBe("owner@example.com");
      expect(mockSend.mock.calls[0][0].subject).toBe("New SMIQ response — The Teacher");
    });

    it("includes teaching role/graduation level rows with resolved labels", async () => {
      vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@example.com");
      await sendOwnerNotification(baseArgs);
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).toContain("Teaching role");
      expect(html).toContain("I teach classes");
      expect(html).toContain("Graduation level");
      expect(html).toContain("Monitor / Instructor");
    });

    it("falls back to the raw code for an unmatched-but-truthy teachingRole", async () => {
      vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@example.com");
      await sendOwnerNotification({ ...baseArgs, teachingRole: "not-a-real-role" });
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).toContain("not-a-real-role");
    });

    it("omits teaching role/graduation level rows when the code is null", async () => {
      vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@example.com");
      await sendOwnerNotification({ ...baseArgs, teachingRole: null, graduationLevel: null });
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).not.toContain("Teaching role");
      expect(html).not.toContain("Graduation level");
    });

    it("falls back to — for a null lang", async () => {
      vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@example.com");
      await sendOwnerNotification({ ...baseArgs, lang: null });
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).toContain(">—<");
    });

    it("falls back to the raw lang code when unmapped", async () => {
      vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@example.com");
      await sendOwnerNotification({ ...baseArgs, lang: "de" });
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).toContain(">de<");
    });

    it("falls back to the raw segment code when unmapped", async () => {
      vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@example.com");
      await sendOwnerNotification({ ...baseArgs, segment: "not-a-real-segment" });
      expect(mockSend.mock.calls[0][0].subject).toBe("New SMIQ response — not-a-real-segment");
    });

    it("formats Confirmed at using en-GB medium/short UTC", async () => {
      vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@example.com");
      await sendOwnerNotification(baseArgs);
      const html = mockSend.mock.calls[0][0].html as string;
      const expected = baseArgs.createdAt.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      });
      expect(html).toContain(`${expected} UTC`);
    });

    it("escapes HTML-significant characters in name/email/smiqAnswer", async () => {
      vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@example.com");
      await sendOwnerNotification({
        ...baseArgs,
        name: `<b>Jane</b>`,
        email: `jane"doe@example.com`,
        smiqAnswer: `it's "great" & <fun>`,
      });
      const html = mockSend.mock.calls[0][0].html as string;
      expect(html).toContain("&lt;b&gt;Jane&lt;/b&gt;");
      expect(html).toContain("jane&quot;doe@example.com");
      expect(html).toContain("it&#39;s &quot;great&quot; &amp; &lt;fun&gt;");
    });

    it("throws with the stringified error when emails.send returns an error", async () => {
      vi.stubEnv("OWNER_NOTIFICATION_EMAIL", "owner@example.com");
      mockSend.mockResolvedValue({ data: null, error: { message: "bad request" } });
      await expect(sendOwnerNotification(baseArgs)).rejects.toThrow(/Resend error:.*bad request/);
    });
  });
});
