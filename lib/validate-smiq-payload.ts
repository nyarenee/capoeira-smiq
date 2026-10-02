import { SEGMENTS, TEACHING_ROLES, GRADUATION_LEVELS, LANGUAGES } from "@/lib/reference-data";

export type SubmitPayload = {
  segment: string;
  smiqAnswer: string;
  teachingRole: string | null;
  graduationLevel: string | null;
  name: string;
  email: string;
  lang: string;
  turnstileToken: string;
};

export type NormalizedSubmitPayload = {
  segment: string;
  smiqAnswer: string;
  teachingRole: string | null;
  graduationLevel: string | null;
  name: string;
  email: string;
  lang: string;
};

const VALID_SEGMENTS = new Set<string>(SEGMENTS.map((s) => s.code));
const VALID_TEACHING_ROLES = new Set<string>(TEACHING_ROLES.map((r) => r.code));
const VALID_GRADUATION_LEVELS = new Set<string>(GRADUATION_LEVELS.map((g) => g.code));
const SUPPORTED_LANGS = new Set<string>(LANGUAGES.map((l) => l.code));

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function validatePayload(
  payload: SubmitPayload
): { ok: true; payload: NormalizedSubmitPayload } | { ok: false; error: string } {
  const segment = normalizeText(payload.segment).toLowerCase();
  const smiqAnswer = normalizeText(payload.smiqAnswer);
  const teachingRole = normalizeText(payload.teachingRole);
  const graduationLevel = normalizeText(payload.graduationLevel);
  const name = normalizeText(payload.name);
  const email = normalizeText(payload.email).toLowerCase();
  const lang = SUPPORTED_LANGS.has(payload.lang) ? payload.lang : "en";

  if (!segment || !smiqAnswer || !name || !email) {
    return { ok: false, error: "Please fill in all required fields." };
  }

  if (!VALID_SEGMENTS.has(segment)) {
    return { ok: false, error: "The selected segment is invalid." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  if (segment === "teacher") {
    if (!VALID_TEACHING_ROLES.has(teachingRole)) {
      return { ok: false, error: "Please select a teaching situation." };
    }

    if (!VALID_GRADUATION_LEVELS.has(graduationLevel)) {
      return { ok: false, error: "Please select a graduation level." };
    }

    return {
      ok: true,
      payload: {
        segment,
        smiqAnswer,
        teachingRole,
        graduationLevel,
        name,
        email,
        lang,
      },
    };
  }

  return {
    ok: true,
    payload: {
      segment,
      smiqAnswer,
      teachingRole: null,
      graduationLevel: null,
      name,
      email,
      lang,
    },
  };
}
