const SCHEME = "Bearer ";

export async function requireApiAuth(req: Request): Promise<Response | null> {
  const expected = process.env.API_AUTH_TOKEN;
  if (!expected) {
    console.warn("[api-auth] API_AUTH_TOKEN not set — rejecting");
    return unauthorized();
  }

  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith(SCHEME)) return unauthorized();

  const provided = header.slice(SCHEME.length).trim();
  if (!provided || !(await constantTimeEqual(provided, expected))) {
    return unauthorized();
  }

  return null;
}

function unauthorized(): Response {
  return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) diff |= bytesA[i] ^ bytesB[i];
  return diff === 0;
}
