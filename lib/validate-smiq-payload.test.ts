import { describe, expect, it } from "vitest";
import { validatePayload, type SubmitPayload } from "@/lib/validate-smiq-payload";
import { TEACHING_ROLES, GRADUATION_LEVELS } from "@/lib/reference-data";

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

describe("validatePayload", () => {
  describe("valid non-teacher segments", () => {
    for (const segment of ["curious", "student", "practitioner", "lapsed"]) {
      it(`accepts segment "${segment}" and nulls out teacher fields`, () => {
        const result = validatePayload(payload({ segment }));
        expect(result).toEqual({
          ok: true,
          payload: {
            segment,
            smiqAnswer: "some answer",
            teachingRole: null,
            graduationLevel: null,
            name: "Jane Doe",
            email: "jane@example.com",
            lang: "en",
          },
        });
      });
    }

    it("normalizes segment casing and surrounding whitespace", () => {
      const result = validatePayload(payload({ segment: "  CURIOUS  " }));
      expect(result.ok).toBe(true);
      expect(result.ok && result.payload.segment).toBe("curious");
    });
  });

  describe("valid teacher segment", () => {
    it("accepts a valid teachingRole/graduationLevel and preserves them", () => {
      const result = validatePayload(
        payload({ segment: "teacher", teachingRole: "classes", graduationLevel: "monitor" })
      );
      expect(result).toEqual({
        ok: true,
        payload: {
          segment: "teacher",
          smiqAnswer: "some answer",
          teachingRole: "classes",
          graduationLevel: "monitor",
          name: "Jane Doe",
          email: "jane@example.com",
          lang: "en",
        },
      });
    });

    for (const role of TEACHING_ROLES) {
      it(`accepts every defined teaching role: "${role.code}"`, () => {
        const result = validatePayload(
          payload({ segment: "teacher", teachingRole: role.code, graduationLevel: "monitor" })
        );
        expect(result.ok).toBe(true);
      });
    }

    for (const level of GRADUATION_LEVELS) {
      it(`accepts every defined graduation level: "${level.code}"`, () => {
        const result = validatePayload(
          payload({ segment: "teacher", teachingRole: "classes", graduationLevel: level.code })
        );
        expect(result.ok).toBe(true);
      });
    }
  });

  describe("invalid segment", () => {
    it("rejects an unknown segment code", () => {
      const result = validatePayload(payload({ segment: "unknown-code" }));
      expect(result).toEqual({ ok: false, error: "The selected segment is invalid." });
    });
  });

  describe("missing required fields", () => {
    it("rejects an empty segment", () => {
      const result = validatePayload(payload({ segment: "" }));
      expect(result).toEqual({ ok: false, error: "Please fill in all required fields." });
    });

    it("rejects an empty smiqAnswer", () => {
      const result = validatePayload(payload({ smiqAnswer: "" }));
      expect(result).toEqual({ ok: false, error: "Please fill in all required fields." });
    });

    it("rejects an empty name", () => {
      const result = validatePayload(payload({ name: "" }));
      expect(result).toEqual({ ok: false, error: "Please fill in all required fields." });
    });

    it("rejects an empty email", () => {
      const result = validatePayload(payload({ email: "" }));
      expect(result).toEqual({ ok: false, error: "Please fill in all required fields." });
    });

    it("rejects a whitespace-only name", () => {
      const result = validatePayload(payload({ name: "   " }));
      expect(result).toEqual({ ok: false, error: "Please fill in all required fields." });
    });

    it("rejects a whitespace-only email (hits the required-fields check, not the email-format check)", () => {
      const result = validatePayload(payload({ email: "   " }));
      expect(result).toEqual({ ok: false, error: "Please fill in all required fields." });
    });
  });

  describe("teacher-branch requirements", () => {
    it("rejects a missing teachingRole", () => {
      const result = validatePayload(
        payload({ segment: "teacher", teachingRole: null, graduationLevel: "monitor" })
      );
      expect(result).toEqual({ ok: false, error: "Please select a teaching situation." });
    });

    it("rejects an invalid teachingRole", () => {
      const result = validatePayload(
        payload({ segment: "teacher", teachingRole: "not-a-real-role", graduationLevel: "monitor" })
      );
      expect(result).toEqual({ ok: false, error: "Please select a teaching situation." });
    });

    it("rejects a missing graduationLevel", () => {
      const result = validatePayload(
        payload({ segment: "teacher", teachingRole: "classes", graduationLevel: null })
      );
      expect(result).toEqual({ ok: false, error: "Please select a graduation level." });
    });

    it("rejects an invalid graduationLevel", () => {
      const result = validatePayload(
        payload({
          segment: "teacher",
          teachingRole: "classes",
          graduationLevel: "not-a-real-level",
        })
      );
      expect(result).toEqual({ ok: false, error: "Please select a graduation level." });
    });
  });

  describe("non-teacher segments ignore submitted teacher fields", () => {
    it("nulls out teachingRole/graduationLevel even if the client sent them", () => {
      const result = validatePayload(
        payload({ segment: "curious", teachingRole: "classes", graduationLevel: "monitor" })
      );
      expect(result).toEqual({
        ok: true,
        payload: {
          segment: "curious",
          smiqAnswer: "some answer",
          teachingRole: null,
          graduationLevel: null,
          name: "Jane Doe",
          email: "jane@example.com",
          lang: "en",
        },
      });
    });
  });

  describe("malformed email", () => {
    const cases: Array<[string, string]> = [
      ["no @ sign", "no-at-sign.com"],
      ["no domain dot", "user@nodotdomain"],
      ["trailing dot with nothing after", "user@domain."],
      ["multiple @ signs", "a@b@c.com"],
    ];

    for (const [label, email] of cases) {
      it(`rejects: ${label} ("${email}")`, () => {
        const result = validatePayload(payload({ email }));
        expect(result).toEqual({ ok: false, error: "Please enter a valid email address." });
      });
    }
  });

  describe("valid email normalization", () => {
    it("trims and lowercases the email", () => {
      const result = validatePayload(payload({ email: "  Jane@Example.COM  " }));
      expect(result.ok).toBe(true);
      expect(result.ok && result.payload.email).toBe("jane@example.com");
    });
  });

  describe("lang fallback", () => {
    it('falls back to "en" for an unsupported lang', () => {
      const result = validatePayload(payload({ lang: "de" }));
      expect(result.ok).toBe(true);
      expect(result.ok && result.payload.lang).toBe("en");
    });

    it("preserves a supported lang", () => {
      const result = validatePayload(payload({ lang: "pt" }));
      expect(result.ok).toBe(true);
      expect(result.ok && result.payload.lang).toBe("pt");
    });
  });
});
