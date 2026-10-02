function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Integration/E2E tests run against the staging environment — ` +
        `populate .env.staging-test (see README.md "Staging") and run via npm run test:integration / test:e2e.`
    );
  }
  return value;
}

export const STAGING_URL = required("STAGING_URL").replace(/\/$/, "");
export const STAGING_DATABASE_URL = required("STAGING_DATABASE_URL");
export const STAGING_API_AUTH_TOKEN = required("STAGING_API_AUTH_TOKEN");

/**
 * The Resend account's own verified email. Resend's `onboarding@resend.dev`
 * sender (used by staging and production — no custom domain is verified,
 * see PROJECT_NOTES.md "Known issue — Resend likely rejects real users'
 * confirmation emails") only accepts sends to this exact address; any other
 * recipient gets a 403, which submitResponse's catch turns into a visible
 * form error. Any E2E test that submits through the real form must type
 * this address into the email field, or the test can never progress past
 * the submit step — confirmed empirically (+addressing does not bypass
 * this; Resend matches the address exactly).
 */
export const RESEND_SANDBOX_OWNER_EMAIL = "maltasgtd@gmail.com";
