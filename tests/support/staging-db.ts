import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, lt, like } from "drizzle-orm";
import * as schema from "@/db/schema";
import { pendingSmiqSubmissions, smiqResponses } from "@/db/schema";
import { STAGING_DATABASE_URL } from "./staging-env";

// IANA-reserved TLD (RFC 2606) — guaranteed to never collide with a real
// signup, so automated test rows are trivially distinguishable from real
// staging traffic by email alone.
const TEST_EMAIL_DOMAIN = "e2e.capoeirainternational.test";
const TEST_EMAIL_LIKE_PATTERN = `smiq-test+%@${TEST_EMAIL_DOMAIN}`;
const STALE_AFTER_MS = 2 * 60 * 60 * 1000; // 2 hours

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
function db() {
  if (!_db) _db = drizzle(neon(STAGING_DATABASE_URL), { schema });
  return _db;
}

/** A unique, clearly-fake email for one test case. Never reused across runs. */
export function testEmail(label: string): string {
  const unique = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const safeLabel = label.replace(/[^a-z0-9-]/gi, "-");
  return `smiq-test+${safeLabel}-${unique}@${TEST_EMAIL_DOMAIN}`;
}

export async function findPendingSubmissionByEmail(email: string) {
  const rows = await db()
    .select()
    .from(pendingSmiqSubmissions)
    .where(eq(pendingSmiqSubmissions.email, email));
  return rows[0] ?? null;
}

export async function findSmiqResponseByEmail(email: string) {
  const rows = await db().select().from(smiqResponses).where(eq(smiqResponses.email, email));
  return rows[0] ?? null;
}

/** Polls for the row `submitResponse` writes asynchronously after a form submit. */
export async function waitForPendingSubmission(email: string, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const row = await findPendingSubmissionByEmail(email);
    if (row) return row;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for a pending_smiq_submissions row for ${email}`);
}

/**
 * Inserts a pending row directly (bypassing submitResponse/Turnstile) so
 * confirm-flow behavior can be tested without a browser or a real submit.
 */
export async function seedPendingSubmission(overrides: {
  email: string;
  segment?: string;
  expiresAt?: Date;
}) {
  const token = crypto.randomUUID();
  await db()
    .insert(pendingSmiqSubmissions)
    .values({
      token,
      name: "E2E Test",
      email: overrides.email,
      segment: overrides.segment ?? "curious",
      smiqAnswer: "Seeded directly for a confirm-flow test case.",
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  return token;
}

/** Convenience wrapper for the expired-token test case. */
export async function seedExpiredPendingSubmission(overrides: { email: string; segment?: string }) {
  return seedPendingSubmission({ ...overrides, expiresAt: new Date(Date.now() - 60 * 60 * 1000) });
}

/** Deletes any rows this test run created, by exact email. Call in test teardown. */
export async function deleteTestRowsByEmail(email: string) {
  await db().delete(pendingSmiqSubmissions).where(eq(pendingSmiqSubmissions.email, email));
  await db().delete(smiqResponses).where(eq(smiqResponses.email, email));
}

/**
 * Deletes stale test rows left behind by a previous run that crashed before
 * its own teardown. Matches only the reserved test-email pattern, so it can
 * never touch real staging traffic. Safe to call at the start of every run.
 */
export async function sweepStaleTestRows() {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  await db()
    .delete(pendingSmiqSubmissions)
    .where(
      and(
        like(pendingSmiqSubmissions.email, TEST_EMAIL_LIKE_PATTERN),
        lt(pendingSmiqSubmissions.createdAt, cutoff)
      )
    );
  await db()
    .delete(smiqResponses)
    .where(
      and(like(smiqResponses.email, TEST_EMAIL_LIKE_PATTERN), lt(smiqResponses.createdAt, cutoff))
    );
}
