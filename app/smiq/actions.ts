"use server";

import { and, eq, gt, lt } from "drizzle-orm";
import { after } from "next/server";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { smiqResponses, pendingSmiqSubmissions } from "@/db/schema";
import { subscribeToKit } from "@/lib/kit";
import { sendConfirmationEmail, sendOwnerNotification } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { validatePayload, type SubmitPayload } from "@/lib/validate-smiq-payload";

export type SubmitResult = { ok: true; pendingEmail: string } | { ok: false; error: string };

export async function submitResponse(payload: SubmitPayload): Promise<SubmitResult> {
  const validated = validatePayload(payload);
  if (!validated.ok) {
    return validated;
  }

  const { segment, smiqAnswer, teachingRole, graduationLevel, name, email, lang } =
    validated.payload;

  if (!process.env.DATABASE_URL) {
    return { ok: false, error: "Submission is temporarily unavailable. Please try again later." };
  }

  const remoteip = (await headers()).get("cf-connecting-ip") ?? undefined;
  const verified = await verifyTurnstileToken(payload.turnstileToken, remoteip);
  if (!verified) {
    return { ok: false, error: "Verification failed. Please try again." };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  try {
    const db = getDb();

    await db.delete(pendingSmiqSubmissions).where(lt(pendingSmiqSubmissions.expiresAt, new Date()));

    await db.insert(pendingSmiqSubmissions).values({
      token,
      expiresAt,
      segment,
      smiqAnswer,
      teachingRole,
      graduationLevel,
      name,
      email,
      lang,
    });

    await sendConfirmationEmail({ name, email, token, lang });

    return { ok: true, pendingEmail: email };
  } catch (error) {
    console.error("Failed to create pending SMIQ submission", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function confirmResponse(token: string): Promise<{ ok: boolean }> {
  if (!token) return { ok: false };

  const db = getDb();

  const [row] = await db
    .delete(pendingSmiqSubmissions)
    .where(
      and(eq(pendingSmiqSubmissions.token, token), gt(pendingSmiqSubmissions.expiresAt, new Date()))
    )
    .returning();

  if (!row) return { ok: false };

  try {
    await db.insert(smiqResponses).values({
      segment: row.segment,
      smiqAnswer: row.smiqAnswer,
      teachingRole: row.teachingRole,
      graduationLevel: row.graduationLevel,
      name: row.name,
      email: row.email,
      lang: row.lang,
    });

    after(() =>
      subscribeToKit({
        name: row.name,
        email: row.email,
        segment: row.segment,
        teachingRole: row.teachingRole,
        graduationLevel: row.graduationLevel,
        lang: row.lang,
      }).catch((err) => console.error("[kit]", err))
    );

    after(() =>
      sendOwnerNotification({
        name: row.name,
        email: row.email,
        segment: row.segment,
        smiqAnswer: row.smiqAnswer,
        teachingRole: row.teachingRole,
        graduationLevel: row.graduationLevel,
        lang: row.lang,
        createdAt: new Date(),
      }).catch((err) => console.error("[email:owner-notification]", err))
    );

    return { ok: true };
  } catch (error) {
    // The pending row is already deleted at this point (consumed by the token),
    // so log its full contents on insert failure — otherwise a failed insert
    // here loses the submission with no way to recover it.
    console.error("Failed to confirm SMIQ submission", error, row);
    return { ok: false };
  }
}
