import { test, expect } from "@playwright/test";
import {
  selectSegment,
  fillSmiqAnswer,
  completeTeacherStep,
  fillContactAndSubmit,
} from "./helpers";
import { testMarker, waitForPendingSubmission, deleteTestRowByMarker } from "../support/staging-db";
import { RESEND_SANDBOX_OWNER_EMAIL } from "../support/staging-env";

// Tests that complete a real submission must type RESEND_SANDBOX_OWNER_EMAIL
// into the email field — Resend's onboarding@resend.dev sender 403s any
// other recipient (see PROJECT_NOTES.md "Known issue"), so submitResponse
// would never succeed otherwise. Since every such test shares that one
// address, this describe block runs serially (not the config's default
// fullyParallel) to avoid racing on which pending row belongs to which
// test, and each test embeds a unique marker in its SMIQ answer so cleanup
// only ever touches its own row.
test.describe("full funnel submission (shared sandbox inbox, serial)", () => {
  test.describe.configure({ mode: "serial" });

  async function submitSegment(
    page: import("@playwright/test").Page,
    segment: "curious" | "student" | "practitioner" | "lapsed",
    label: string
  ) {
    const marker = testMarker(segment);
    await page.goto("/smiq");
    await selectSegment(page, segment);
    await fillSmiqAnswer(page, `My single most important challenge. ${marker}`);
    await expect(page.locator("#step-2")).toHaveCount(0);
    await expect(page.locator("#step-3")).toBeVisible();

    await fillContactAndSubmit(page, {
      name: `${segment} Tester`,
      email: RESEND_SANDBOX_OWNER_EMAIL,
    });
    await expect(page.locator("#success-badge")).toContainText(label);

    const pending = await waitForPendingSubmission(RESEND_SANDBOX_OWNER_EMAIL, {
      smiqAnswerContains: marker,
    });
    expect(pending.segment).toBe(segment);

    await deleteTestRowByMarker(RESEND_SANDBOX_OWNER_EMAIL, marker);
  }

  test("curious: non-teacher flow skips the teacher step and submits", async ({ page }) => {
    await submitSegment(page, "curious", "The Curious One");
  });

  test("student: full funnel submits successfully", async ({ page }) => {
    await submitSegment(page, "student", "The Student");
  });

  test("practitioner: full funnel submits successfully", async ({ page }) => {
    await submitSegment(page, "practitioner", "The Practitioner");
  });

  test("lapsed: is NOT routed as a teacher (no teacher step appears)", async ({ page }) => {
    // Known discrepancy (see CLAUDE.md / PROJECT_CONTEXT.md / PROJECT_NOTES.md):
    // lapsed is spec'd to get different success copy, but the code currently
    // renders the same generic pending/confirmed copy for every segment —
    // this asserts current behavior, not the spec'd behavior.
    await submitSegment(page, "lapsed", "The One Who Left");
  });

  test("teacher: teacher step appears and requires both role and graduation level", async ({
    page,
  }) => {
    const marker = testMarker("teacher");
    await page.goto("/smiq");
    await selectSegment(page, "teacher");
    await fillSmiqAnswer(page, `My single most important challenge as a teacher. ${marker}`);

    await expect(page.locator("#step-2")).toBeVisible();
    await expect(page.locator("#next-from-teacher")).toBeDisabled();

    await completeTeacherStep(page, "classes", "monitor");
    await expect(page.locator("#step-3")).toBeVisible();

    await fillContactAndSubmit(page, { name: "Teacher Tester", email: RESEND_SANDBOX_OWNER_EMAIL });
    await expect(page.locator("#success-badge")).toContainText("The Teacher");

    const pending = await waitForPendingSubmission(RESEND_SANDBOX_OWNER_EMAIL, {
      smiqAnswerContains: marker,
    });
    expect(pending.segment).toBe("teacher");
    expect(pending.teachingRole).toBe("classes");
    expect(pending.graduationLevel).toBe("monitor");

    await deleteTestRowByMarker(RESEND_SANDBOX_OWNER_EMAIL, marker);
  });
});

// These never reach a real submit (the disabled-button case stops short of
// clicking it; the nav/locale cases never reach step 3 with a token), so
// they don't touch the shared sandbox inbox and can run in parallel.
test.describe("funnel UI behavior (no real submission, parallel)", () => {
  test("submit is disabled until name, email, and a Turnstile token are all present", async ({
    page,
  }) => {
    await page.goto("/smiq");
    await selectSegment(page, "curious");
    await fillSmiqAnswer(page, "Enough characters to enable the continue button for this check.");

    await expect(page.locator("#submit-btn")).toBeDisabled();
    await page.locator("#name-input").fill("Disabled Button Test");
    await expect(page.locator("#submit-btn")).toBeDisabled();
    await page.locator("#email-input").fill("still-not-submitted@example.com");
    // Turnstile needs a moment to load/resolve even with name+email filled.
    await expect(page.locator("#submit-btn")).toBeEnabled({ timeout: 15000 });
  });

  test("back/forward navigation: leaving the teacher step and switching segments re-skips it correctly", async ({
    page,
  }) => {
    await page.goto("/smiq");
    await selectSegment(page, "teacher");
    await fillSmiqAnswer(
      page,
      "An answer long enough to pass the minimum length check for this test."
    );
    await expect(page.locator("#step-2")).toBeVisible();

    await page.locator("#back-from-teacher").click();
    await expect(page.locator("#step-1")).toBeVisible();

    await page.locator("#back-from-smiq").click();
    await expect(page.locator("#step-0")).toBeVisible();

    await selectSegment(page, "curious");
    await expect(page.locator("#smiq-answer")).not.toHaveValue("");
    await page.locator("#next-from-smiq").click();

    // Switching away from teacher should skip step 2 again, going straight
    // to step 3 instead of re-showing the teacher branch.
    await expect(page.locator("#step-2")).toHaveCount(0);
    await expect(page.locator("#step-3")).toBeVisible();
  });

  test("renders Portuguese copy when the capoeira-lang cookie is set", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "capoeira-lang", value: "pt", url: baseURL }]);
    await page.goto("/smiq");
    await expect(page.locator('[data-segment="curious"] .seg-name')).toHaveText("O Curioso");
    await expect(page.locator('[data-segment="teacher"] .seg-name')).toHaveText("O Professor");
  });
});
