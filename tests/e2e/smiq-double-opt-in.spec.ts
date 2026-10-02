import { test, expect } from "@playwright/test";
import { selectSegment, fillSmiqAnswer, fillContactAndSubmit } from "./helpers";
import {
  testMarker,
  waitForPendingSubmission,
  findSmiqResponseByEmail,
  deleteTestRowByMarker,
} from "../support/staging-db";
import { RESEND_SANDBOX_OWNER_EMAIL } from "../support/staging-env";

// Full double opt-in roundtrip through the real deployed UI: submit, then
// simulate clicking the emailed confirm link by navigating straight to it
// with the token read from the staging DB (tests can't click a real email,
// but they do have DATABASE_URL — see tests/support/staging-db.ts).
//
// Uses RESEND_SANDBOX_OWNER_EMAIL (see staging-env.ts) since submission
// must go through Resend's sandboxed sender; runs serially for the same
// reason as tests/e2e/smiq-funnel.spec.ts's submission tests.
test.describe("double opt-in confirm roundtrip (shared sandbox inbox, serial)", () => {
  test.describe.configure({ mode: "serial" });

  test("submit -> confirm -> response row created -> replay fails (single-use)", async ({
    page,
  }) => {
    const marker = testMarker("double-opt-in");

    await page.goto("/intelligence");
    await selectSegment(page, "curious");
    await fillSmiqAnswer(page, `Double opt-in roundtrip test answer. ${marker}`);
    await fillContactAndSubmit(page, {
      name: "Double Opt-In Tester",
      email: RESEND_SANDBOX_OWNER_EMAIL,
    });

    const pending = await waitForPendingSubmission(RESEND_SANDBOX_OWNER_EMAIL, {
      smiqAnswerContains: marker,
    });
    expect(pending.token).toBeTruthy();
    expect(pending.segment).toBe("curious");

    const expiresAt = pending.expiresAt ? new Date(pending.expiresAt) : null;
    expect(expiresAt).not.toBeNull();
    const hoursUntilExpiry = (expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(hoursUntilExpiry).toBeGreaterThan(23);
    expect(hoursUntilExpiry).toBeLessThan(25);

    // Simulate clicking the confirmation email's link.
    await page.goto(`/intelligence/confirm?token=${pending.token}`);
    expect(page.url()).toContain("/intelligence/confirmed");
    expect(page.url()).not.toContain("expired=1");

    const responseRow = await findSmiqResponseByEmail(RESEND_SANDBOX_OWNER_EMAIL, {
      smiqAnswerContains: marker,
    });
    expect(responseRow).not.toBeNull();
    expect(responseRow?.segment).toBe("curious");

    // Single-use enforcement: the pending row was consumed by the first
    // confirm (atomic DELETE...RETURNING in confirmResponse), so the same
    // link should no longer work.
    await page.goto(`/intelligence/confirm?token=${pending.token}`);
    expect(page.url()).toContain("expired=1");

    await deleteTestRowByMarker(RESEND_SANDBOX_OWNER_EMAIL, marker);
  });
});
