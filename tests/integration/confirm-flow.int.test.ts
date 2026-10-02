import { describe, it, expect, afterEach } from "vitest";
import { STAGING_URL } from "../support/staging-env";
import {
  testEmail,
  seedPendingSubmission,
  seedExpiredPendingSubmission,
  findSmiqResponseByEmail,
  deleteTestRowsByEmail,
} from "../support/staging-db";

// Browser-free coverage of GET /intelligence/confirm's server-side guard
// logic (confirmResponse in app/intelligence/actions.ts), seeding pending_smiq_submissions
// rows directly rather than going through a real form submit. Faster, cheaper
// signal than the equivalent Playwright cases in
// tests/e2e/smiq-double-opt-in.spec.ts — intentional defense in depth, not
// duplication: a regression in the DB-level guard is caught here in
// milliseconds instead of waiting on a full browser run.

const emailsToClean: string[] = [];

afterEach(async () => {
  await Promise.all(emailsToClean.splice(0).map((email) => deleteTestRowsByEmail(email)));
});

async function confirm(token: string) {
  return fetch(`${STAGING_URL}/intelligence/confirm?token=${encodeURIComponent(token)}`);
}

describe("GET /intelligence/confirm (staging)", () => {
  it("confirms a valid token: redirects to /intelligence/confirmed and inserts a smiq_responses row", async () => {
    const email = testEmail("confirm-valid");
    emailsToClean.push(email);
    const token = await seedPendingSubmission({ email });

    const res = await confirm(token);

    expect(res.url).toContain("/intelligence/confirmed");
    expect(res.url).not.toContain("expired=1");

    const responseRow = await findSmiqResponseByEmail(email);
    expect(responseRow).not.toBeNull();
    expect(responseRow?.segment).toBe("curious");
  });

  it("rejects an expired token: redirects with ?expired=1 and does not create a response", async () => {
    const email = testEmail("confirm-expired");
    emailsToClean.push(email);
    const token = await seedExpiredPendingSubmission({ email });

    const res = await confirm(token);

    expect(res.url).toContain("/intelligence/confirmed?expired=1");

    const responseRow = await findSmiqResponseByEmail(email);
    expect(responseRow).toBeNull();
  });

  it("rejects an invalid/unknown token: redirects with ?expired=1", async () => {
    const res = await confirm("not-a-real-token-" + crypto.randomUUID());
    expect(res.url).toContain("/intelligence/confirmed?expired=1");
  });

  it("enforces single use: confirming the same token twice fails the second time", async () => {
    const email = testEmail("confirm-replay");
    emailsToClean.push(email);
    const token = await seedPendingSubmission({ email });

    const first = await confirm(token);
    expect(first.url).toContain("/intelligence/confirmed");
    expect(first.url).not.toContain("expired=1");

    const second = await confirm(token);
    expect(second.url).toContain("/intelligence/confirmed?expired=1");
  });
});
