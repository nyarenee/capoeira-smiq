# Capoeira SMIQ Funnel — Project Notes

> Living memory document. Update as decisions get made.
> Original v1 handoff is in `PROJECT_CONTEXT.md` (uploaded to first session).

## Snapshot (as of April 2026)

- **Live URL:** https://maltascapoeira.github.io/smiq/
- **Repo:** github.com/maltascapoeira/smiq (inferred from GH Pages URL)
- **Owner:** Nya, Malta Capoeira
- **Brand:** "Capoeira International" — addresses the global Capoeira community,
  run from Malta
- **Status:** Site is live, but Supabase project is paused due to non-usage.
  Only 0–10 responses collected — no meaningful data to migrate. About to be
  re-architected from static HTML to a full-stack Node app.

## Why we're rebuilding

1. **Tech stack feels limiting.** Vanilla HTML/CSS/JS with no build step makes
   future features hard to add.
2. **Anthropic API key exposed in browser.** `capoeira-dashboard.html` calls
   `https://api.anthropic.com/v1/messages` directly from client code — the key
   is visible to anyone viewing source. A Node backend keeps the key server-side.

## Target architecture (v2)

| Concern    | Choice                                                       |
|------------|--------------------------------------------------------------|
| Framework  | **Next.js** (App Router)                                     |
| Hosting    | **Cloudflare Workers** (via OpenNext, decided 2026-07-21)    |
| Database   | **Neon Postgres** (decided)                                  |
| Auth       | Real email/password or magic-link login on the dashboard     |
| AI calls   | Server-side only, API key in env var                         |
| Email      | TBD — Resend is the obvious pick for Vercel + magic links    |

### Why Cloudflare Workers (decided 2026-07-21)

- Long-term hosting platform, moving off Vercel
- Deployed via `@opennextjs/cloudflare` (OpenNext's Cloudflare adapter) — Cloudflare
  doesn't yet have a "verified" first-party Next.js adapter, so this is their
  recommended integration path as of this build
- Good fit here: no `next/image`, no filesystem access, no edge-runtime-only code,
  and `@neondatabase/serverless` already talks to Neon over HTTP, so it works
  unmodified inside the Workers runtime
- R2-backed ISR/tag caching was intentionally skipped for now (no ISR/revalidation
  in this app yet) — see `open-next.config.ts` if that's needed later
- Deployed first to the free `*.workers.dev` subdomain; custom domain is still an
  open question (see below), to be wired up via Cloudflare once decided
- Neon's DB connection is independent of the hosting platform (plain connection
  string), so this move doesn't affect the database setup — only the one-click
  Vercel marketplace convenience is lost, no functional change

### Why Neon (decided 2026-04-28)

- First-class Vercel marketplace integration (one-click)
- Serverless Postgres, scales to zero (free tier easily covers this funnel)
- Plain Postgres — no vendor SDK lock-in, no RLS complexity (not needed once
  API is server-side)
- Database branching for staging/preview deploys

## Testing (decided 2026-09-19)

- **Test runner: Vitest.** No test infra existed in the repo before this —
  no vitest/jest, no config, no test files. Vitest was chosen because it
  fits a Next.js/TS/ESM project cleanly with nothing to migrate off.
  `npm test` runs it (`vitest run`); config is `vitest.config.ts` with a
  manual `@/*` alias (one alias in `tsconfig.json`, so a full
  tsconfig-parsing plugin wasn't worth the dependency).
- **`"use server"` files can only export async functions.** Confirmed
  against this repo's actual installed Next 16.2.6 — not assumed from
  training data, per `AGENTS.md`'s warning that this Next version diverges
  — via `node_modules/next/dist/server/typescript/rules/server-boundary.js`,
  which is a live typecheck error here since `tsconfig.json` registers the
  `next` TS plugin. Practical effect: any sync helper inside a `"use
  server"` action file (e.g. `app/smiq/actions.ts`) can't be exported for
  unit testing without breaking the build. **Pattern going forward:** pure
  sync logic that needs test coverage lives in its own `lib/*.ts` module
  (no directive) and gets imported into the action file — don't add
  `export` to a sync function inside a `"use server"` file.
- First applied to `validatePayload`, extracted to
  `lib/validate-smiq-payload.ts` with a 35-case test suite (segments,
  teacher-branch requirements, malformed email, normalization) — see PR #1.

## Database migrations (decided 2026-10-01)

- **Moved off `drizzle-kit push` onto tracked, reversible migrations.**
  `db:push` diffed `db/schema.ts` straight onto Neon with no history and
  no way back. Now: `db:generate` (drizzle-kit) writes a numbered `.sql`
  migration under `drizzle/`, `db:generate-down` (drizzle-down) writes
  the matching `.down.sql` next to it, and `db:migrate` applies pending
  ones. `db:status`/`db:rollback`/`db:repair` (all drizzle-down) cover
  checking what's applied, undoing a migration, and fixing the tracking
  table. `drizzle.config.ts` needed no changes — drizzle-down reads its
  `out` path directly.
- **Neon was baselined, not re-migrated.** The tables already existed
  from prior `db:push` runs, so applying `0000_...sql` as a normal
  migration would have failed on `CREATE TABLE`. Instead: created the
  `drizzle.__drizzle_migrations` tracking table/schema by hand (the
  exact DDL `drizzle-orm`'s migrator uses — `CREATE SCHEMA IF NOT
  EXISTS drizzle` + `CREATE TABLE IF NOT EXISTS
  drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT
  NULL, created_at bigint)` — since drizzle-kit normally creates this
  itself on first `migrate` and drizzle-down's `repair` only inserts
  rows into it), then ran `drizzle-down repair --baseline` to mark
  migration `0000` applied without re-running its SQL. Verified after
  with `db:migrate` running clean as a no-op.
- `db:push` is gone — no other references to it existed in the repo.
- **Known issue, not yet fixed:** every `pg`/drizzle-kit DB call prints
  a `pg-connection-string` SSL warning — `sslmode=require` in
  `DATABASE_URL` is being treated as an alias for `verify-full` and
  that will stop being true in a future major version of `pg`. Fix
  later with `uselibpqcompat=true&sslmode=require` or explicit
  `sslmode=verify-full` in the Neon connection string.

## API auth groundwork (decided 2026-10-01)

- First protected API route added: `GET /api/smiq/responses`, gated by a
  shared-secret bearer token (`API_AUTH_TOKEN`, checked in
  `lib/api-auth.ts`). This is **not** the real user auth/magic-link login
  the dashboard will eventually need — it's just enough to keep response
  data private while M3 dashboard work gets started. No `users`/`sessions`
  table exists. Revisit and likely supersede this (not layer under it)
  once real multi-user dashboard auth is built.

## Staging environment (decided 2026-10-02)

- **Fulfills the staging item in `PRD.md`'s open questions** (previously
  deferred — see memory `staging-environment-deferred`: testing happened
  directly against prod, with manual cleanup of test rows twice during the
  Kit/Turnstile work). Pulled forward as its own prerequisite once
  integration/E2E test work needed a real deployed target to run against.
- **Neon branch `staging`**, copy-on-write off `production` — isolates test
  data from real response data. Created via the official `neon` CLI
  (`npx neon branches create --name staging --parent production`), now a
  devDependency; also installed the Neon MCP server and the `neon`/
  `neon-postgres`/`neon-postgres-branches` agent skills at the user level
  (not project-level, matching how every other MCP/skill in this environment
  is already set up).
- **Separate Cloudflare Worker `smiq-staging`** (`env.staging` in
  `wrangler.jsonc`), same `main`/`assets`/`compatibility_date` as production
  (inherited — not redeclared), reachable at
  `https://smiq-staging.capoeirainternational.workers.dev`.
- **Deploy stays manual**, matching how production already deploys (no CI
  secrets exist in this repo) — `npm run secrets:staging` / `npm run
  deploy:staging`. No GitHub Actions automation was added.
- **Turnstile:** staging uses Cloudflare's published "always passes" test
  keys instead of the production widget, so form submissions (manual or
  automated) don't need a human to solve a captcha.
- **Resend/Kit reused as-is** — neither has a sandbox mode, and this project
  already accepted that tradeoff (manual cleanup) for the Kit/Turnstile work.
  `OWNER_NOTIFICATION_EMAIL` for staging is the same address as production's
  (this is already a single-developer inbox, not a separate owner alias), and
  since Resend sends through the shared `onboarding@resend.dev` sender
  (no verified custom domain), it can only deliver to that same address
  anyway — a real containment mechanism, not just a convention.
- **`.env.staging` build-time correctness:** `NEXT_PUBLIC_*` vars are inlined
  by `next build`, and Next.js only lets already-set `process.env` values
  win over `.env.local`/`.env.production` — it does not know about a custom
  "staging" env file on its own. `deploy:staging` wraps the build with
  `dotenv-cli` (`dotenv -e .env.staging -- opennextjs-cloudflare build
  --env=staging`) to force staging's values into `process.env` before Next's
  own env loader runs, otherwise the build would silently inline production's
  Turnstile site key. Verified at the time by inspecting the deployed JS
  bundle for the test sitekey — **but that only checked the client-side
  sitekey, never the server-side secret**. The `TURNSTILE_SECRET_KEY` value
  written into `.env.staging` this same session was actually wrong (missing
  3 zeros — `1x0000000000000000000000000000AA`, 32 chars, instead of the
  correct `1x0000000000000000000000000000000AA`, 35 chars), so every
  server-side `verifyTurnstileToken` call on staging failed from the moment
  it was deployed. Found and fixed 2026-10-02 while building the E2E
  submission tests (first thing that actually drove a real browser through
  Turnstile end-to-end) — confirmed via a direct `siteverify` API call with
  the dummy token `XXXX.DUMMY.TOKEN.XXXX`. Also wrong in `README.md` and
  `.env.example` (now fixed there too) — if you ever see
  `1x0000000000000000000000000000AA` (32 chars) anywhere, it's the bad
  value, not a typo to "fix" back to.
- **Smoke test not yet added** — that's the next ticket (integration/E2E
  tests), along with the full form-submission roundtrip and any CI/nightly
  wiring.

## Known issue — Resend likely rejects real users' confirmation emails (found 2026-10-02)

- **In progress, blocked on DNS access (2026-10-02).** Plan: verify
  `mail.capoeirainternational.com` as a dedicated sending subdomain (not the
  root domain — the root will get real inbound email, e.g. Workspace, soon,
  and a subdomain avoids an MX-record collision with that), then point
  `RESEND_FROM_EMAIL` at `hello@mail.capoeirainternational.com`. Domain is
  already created in Resend (id `b448b41b-875e-4017-baa5-f18c7f8d4102`,
  status `not_started`). **Blocked:** `capoeirainternational.com`'s DNS
  isn't on Cloudflare (so Resend's one-click "Sign in to Cloudflare" setup
  doesn't apply) — the business partner who holds registrar access needs to
  add 4 DNS records (1 TXT for DKIM, 1 MX + 1 TXT for SPF, 1 CNAME) directly
  wherever DNS currently lives. Once added and Resend shows the domain
  `verified`, resume: update `RESEND_FROM_EMAIL` in `.env.local`/
  `.env.staging`, push both Worker secrets, verify via `npm run test:e2e`
  (real synthetic-email sends should stop 403ing), then revert the E2E
  sandbox-email workaround below (now unnecessary) and update this note.
- **Not yet fixed. Found while building E2E tests for the submission flow,
  not something this ticket set out to fix.** `GET /domains` on the
  project's Resend account returns an empty list — **no custom domain is
  verified**. Resend's `onboarding@resend.dev` sender only accepts sends
  *to* the account's own verified owner address (confirmed via a live API
  call: a send to `maltasgtd@gmail.com` succeeded; Resend's docs confirm
  any other recipient gets a 403). Production uses this same sender
  (`RESEND_FROM_EMAIL=onboarding@resend.dev` in `.env.local`), so **real
  community members submitting the SMIQ form with their own email almost
  certainly have their confirmation email rejected by Resend** —
  `sendConfirmationEmail` throws on the 403, `submitResponse`'s catch block
  turns that into a generic "Something went wrong" shown to the visitor, and
  no `pending_smiq_submissions` row survives (the insert happens, then the
  whole thing errors out before the user sees a success state — actually:
  insert succeeds first, then the email send throws, so a pending row
  *does* exist but the visitor sees an error and has no reason to check
  their inbox for a confirm link that was never actually delivered).
- Directly explains why `OWNER_NOTIFICATION_EMAIL`'s containment "feature"
  (noted in the Staging environment section above) is really just this same
  restriction viewed from the other side.
- **Fix is infrastructure, not code:** verify a real sending domain in the
  Resend dashboard and point `RESEND_FROM_EMAIL` at it. Out of scope for
  the integration/E2E testing ticket; flagged here for prioritization.
- The new E2E tests (`tests/e2e/`) work around this for the one spec that
  drives a real submission through `submitResponse`: it types the account's
  own verified email (`maltasgtd@gmail.com`) into the form instead of a
  synthetic per-test address, since Resend would otherwise reject the send
  and the test could never reach the pending/confirmed screen. Those tests
  run serially (not parallel) to avoid racing on the one shared pending row.

## What to carry forward from v1

The existing build is well-thought-through. v2 should preserve:

- **Five segments** with exact SMIQ wording (Curious, Student, Practitioner,
  Teacher, Lapsed) — copy lives in `PROJECT_CONTEXT.md`
- **Teacher-only branching:** teaching situation (4 options) + graduation level
  (6 options including "ungraded")
- **Lapsed segment treated as non-teacher** for routing
- **Design system (v2):** rebranded to the MALTAS institutional palette
  (blue/yellow/green/red/gray on white) and Raleway/Carlito typography —
  see CLAUDE.md rule #5. The v1 dark/gold/Playfair system was replaced,
  not carried forward.
- **Tone:** community-first, no fake resource promises, no sales language
- **Success screen:** "Axé, [name]!" with segment-specific copy (lapsed gets
  a different, more reflective message)
- **Dashboard analysis JSON schema:** `strategicSummary` + per-segment themes
  (3–5 themes, each with `name` / `pct` / `insight` / `quote`)

## Bugs already fixed (don't reintroduce)

1. **Apostrophes in single-quoted JS strings** broke parsing — moot in JSX/TSX
2. **Supabase RLS 401 on insert** — no longer relevant once API is server-side

## Open questions (resolve as we go)

- **Multi-language?** Capoeira is Portuguese-rooted; Malta is multilingual —
  worth considering EN/PT/ES at minimum
- **Add lapsed to the dashboard analysis** (was missing in v1's prompt)
- **Custom domain?** Currently on github.io subdomain
- **Branding:** is the Capoeira International wordmark/logo finalised?
- **Email provider** for magic-link auth (Resend recommended)
- **Migration of the 0–10 existing responses** — worth keeping or throwaway?

## Working preferences

- Paul wants strategy and re-architecture suggestions, not just code execution
- The codebase lives in a Git repo (not the local workspace folder), so file-level
  edits will need either repo access or working from copied snippets

## Agentic engineering implementation plan

This project should adopt agentic engineering principles selectively: enough to
improve reliability, maintainability, and safety, without introducing unnecessary
complexity.

### Phase 1 — Stabilize the foundation

- Lock the core product requirements, user journeys, and content boundaries.
- Define the canonical data model for survey responses, segment routing, and
  dashboard outputs.
- Keep AI calls server-side only and enforce clear input/output schemas.
- Add basic validation, structured logging, and error handling around the form
  flow and AI integration.

### Phase 2 — Introduce process discipline

- Version prompts and track changes explicitly.
- Separate prompt templates from orchestration logic so changes are easier to
  review and test.
- Create a lightweight review checklist for prompt, schema, and workflow changes.
- Capture decisions in this file and in the repo docs so the system remains
  understandable over time.

### Phase 3 — Improve reliability and quality

- Add retries, fallbacks, and timeout handling for AI calls.
- Create a small evaluation set of expected outputs for the main survey and
  analysis flows.
- Log failures and quality issues so the system can be tuned based on real use.
- Introduce feature flags where AI behavior is still evolving.

### Phase 4 — Governance and iteration

- Define ownership for prompts, data schemas, and deployment decisions.
- Establish a simple release process for changes that affect user-facing copy or
  AI behavior.
- Review whether the project needs more formal testing, observability, or human
  review before scaling.
- Keep the implementation pragmatic: optimize for clarity, reproducibility, and
  trust rather than over-engineering.
