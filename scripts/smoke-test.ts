import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { url: { type: "string" } } });

const baseUrl = (values.url ?? process.env.SMOKE_TEST_URL ?? "").replace(/\/$/, "");
if (!baseUrl) {
  console.error("Usage: tsx scripts/smoke-test.ts --url=https://... (or set SMOKE_TEST_URL)");
  process.exit(1);
}

const apiAuthToken = process.env.API_AUTH_TOKEN;

type CheckResult = { name: string; pass: boolean; detail?: string };

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function check(name: string, fn: () => Promise<void>): Promise<CheckResult> {
  try {
    await fn();
    return { name, pass: true };
  } catch (err) {
    return { name, pass: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const results: CheckResult[] = [];

  results.push(
    await check("GET / -> 200", async () => {
      const res = await fetch(`${baseUrl}/`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
    })
  );

  results.push(
    await check("GET /intelligence -> 200 with default (en) copy", async () => {
      const res = await fetch(`${baseUrl}/intelligence`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const body = await res.text();
      assert(
        body.includes("Which of these best describes you?"),
        "expected default-locale heading in response body"
      );
    })
  );

  results.push(
    await check("GET /intelligence with pt locale cookie -> 200 with pt copy", async () => {
      const res = await fetch(`${baseUrl}/intelligence`, {
        headers: { Cookie: "capoeira-lang=pt" },
      });
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const body = await res.text();
      assert(
        body.includes("Qual dessas opções melhor te descreve?"),
        "expected pt-locale heading in response body"
      );
    })
  );

  results.push(
    await check("GET /api/smiq/responses with no auth -> 401", async () => {
      const res = await fetch(`${baseUrl}/api/smiq/responses`);
      assert(res.status === 401, `expected 401, got ${res.status}`);
    })
  );

  results.push(
    await check("GET /api/smiq/responses with auth -> 200 with expected shape", async () => {
      assert(!!apiAuthToken, "API_AUTH_TOKEN is not set in the environment");
      const res = await fetch(`${baseUrl}/api/smiq/responses`, {
        headers: { Authorization: `Bearer ${apiAuthToken}` },
      });
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const json = (await res.json()) as { ok?: unknown; count?: unknown; responses?: unknown };
      assert(json.ok === true, "expected ok: true in response body");
      assert(typeof json.count === "number", "expected numeric count in response body");
      assert(Array.isArray(json.responses), "expected responses array in response body");
    })
  );

  console.log(`\nSmoke test results for ${baseUrl}:\n`);
  for (const result of results) {
    console.log(
      `${result.pass ? "✓" : "✗"} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
    );
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Smoke test crashed", err);
  process.exit(1);
});
