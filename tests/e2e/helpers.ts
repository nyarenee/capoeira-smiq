import { type Page, expect } from "@playwright/test";

export type SegmentKey = "curious" | "student" | "practitioner" | "teacher" | "lapsed";

export async function selectSegment(page: Page, key: SegmentKey) {
  await page.locator(`[data-segment="${key}"]`).click();
}

export async function fillSmiqAnswer(page: Page, text: string) {
  await page.locator("#smiq-answer").fill(text);
  await page.locator("#next-from-smiq").click();
}

export async function completeTeacherStep(page: Page, role = "classes", grad = "monitor") {
  await page.locator(`[data-role="${role}"]`).click();
  await page.locator(`[data-grad="${grad}"]`).click();
  await page.locator("#next-from-teacher").click();
}

/** Fills the final step and submits. Waits for Turnstile's test key to
 * auto-resolve (populates the submit button's enabled state) before
 * clicking, then waits for the pending ("check inbox") screen to appear. */
export async function fillContactAndSubmit(
  page: Page,
  { name, email }: { name: string; email: string }
) {
  await page.locator("#name-input").fill(name);
  await page.locator("#email-input").fill(email);
  await expect(page.locator("#submit-btn")).toBeEnabled({ timeout: 15000 });
  await page.locator("#submit-btn").click();
  await expect(page.locator("#success-screen")).toBeVisible({ timeout: 15000 });
}
