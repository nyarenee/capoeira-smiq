const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string, remoteip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY not set — rejecting");
    return false;
  }

  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set("remoteip", remoteip);

  const res = await fetch(SITEVERIFY_URL, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    console.error("[turnstile] siteverify request failed", res.status, await res.text());
    return false;
  }

  const data = (await res.json()) as {
    success: boolean;
    action?: string;
    "error-codes"?: string[];
  };

  if (!data.success) {
    console.warn("[turnstile] verification failed", data["error-codes"]);
    return false;
  }

  // Cloudflare only echoes `action` back for tokens issued by a real widget
  // configured with that action — its own test keys (used in local dev)
  // return success with no `action` field at all. Treat a mismatch as a
  // signal worth logging, not a hard failure: `success` is the authoritative
  // check, since `action` is client-echoed and not cryptographically verified.
  if (data.action !== undefined && data.action !== "submit_smiq") {
    console.warn("[turnstile] unexpected action on an otherwise valid token", data.action);
  }

  return true;
}
