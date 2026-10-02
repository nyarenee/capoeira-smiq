import { test, expect } from "@playwright/test";
import { selectSegment, fillSmiqAnswer, fillContactAndSubmit } from "./helpers";
import {
  testEmail,
  waitForPendingSubmission,
  findSmiqResponseByEmail,
  deleteTestRowsByEmail,
} from "../support/staging-db";

// Full double opt-in roundtrip through the real deployed UI: submit, then
// simulate clicking the emailed confirm link by navigating straight to it
// with the token read from the staging DB (tests can't click a real email,
// but they do have DATABASE_URL — see tests/support/staging-db.ts).
test("submit -> confirm -> response row created -> replay fails (single-use)", async ({ page }) => {
  const email = testEmail("double-opt-in");

  await page.goto("/intelligence");
  await selectSegment(page, "curious");
  await fillSmiqAnswer(page, "Double opt-in roundtrip test answer.");
  await fillContactAndSubmit(page, { name: "Double Opt-In Tester", email });

  const pending = await waitForPendingSubmission(email);
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

  const responseRow = await findSmiqResponseByEmail(email);
  expect(responseRow).not.toBeNull();
  expect(responseRow?.segment).toBe("curious");

  // Single-use enforcement: the pending row was consumed by the first
  // confirm (atomic DELETE...RETURNING in confirmResponse), so the same
  // link should no longer work.
  await page.goto(`/intelligence/confirm?token=${pending.token}`);
  expect(page.url()).toContain("expired=1");

  await deleteTestRowsByEmail(email);
});
