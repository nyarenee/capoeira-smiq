# Capoeira International — SMIQ Funnel (v2)

A community research tool for the global Capoeira community. Segments visitors by their relationship to the art, then asks their single most important challenge in their own words.

Branded as **Capoeira International**, run by **Malta Capoeira**.

[![CI](https://github.com/nyarenee/capoeira-smiq/actions/workflows/ci.yml/badge.svg)](https://github.com/nyarenee/capoeira-smiq/actions/workflows/ci.yml)
[![Staging Tests](https://github.com/nyarenee/capoeira-smiq/actions/workflows/staging-tests.yml/badge.svg)](https://github.com/nyarenee/capoeira-smiq/actions/workflows/staging-tests.yml)

- **v1 (live):** https://maltascapoeira.github.io/smiq/
- **v2 (this repo):** https://smiq.capoeirainternational.workers.dev

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (tokens in `app/globals.css`) |
| Database | Neon Postgres (direct connection string) |
| ORM | Drizzle ORM (`drizzle-orm/neon-http`) |
| Fonts | Playfair Display, Crimson Pro (via `next/font/google`) |
| Deploy | Cloudflare Workers, via `@opennextjs/cloudflare` |

---

## Local development

```bash
npm install
```

Create `.env.local` with the required variables:

```
DATABASE_URL=postgres://...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
OWNER_NOTIFICATION_EMAIL=...             # gets an email on each confirmed SMIQ response
NEXT_PUBLIC_APP_URL=http://localhost:3001
KIT_API_KEY=...
KIT_TAG_ID_ROLE_...             # Kit (ConvertKit) tag IDs — role, graduation, language
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...  # Cloudflare Turnstile — same real widget for local dev and production
TURNSTILE_SECRET_KEY=...            # (localhost/127.0.0.1 are allow-listed on the widget)
API_AUTH_TOKEN=...                  # bearer token for the private /api/smiq/responses endpoint
```

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

---

## Deploy

Deployed to Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). Config lives in `wrangler.jsonc` and `open-next.config.ts`.

```bash
npm run preview   # build + run locally in the Workers runtime
npm run deploy    # build + deploy to Cloudflare
```

Secrets (same keys as `.env.local`, excluding `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) are set on the Worker with:

```bash
npx wrangler secret bulk .env.local
```

`NEXT_PUBLIC_*` vars are inlined into the client bundle at build time rather
than read at Workers runtime — make sure `.env.local` has the real production
Turnstile site key before running `npm run deploy`, not just pushed as a
runtime secret afterward.

Live at https://smiq.capoeirainternational.workers.dev.

---

## Staging

A separate Worker (`smiq-staging`) backed by a Neon branch (`staging`,
branched off `production`).

**Merging to `main` automatically deploys staging** (`.github/workflows/ci.yml`'s
`deploy-staging` job, which also triggers `staging-tests.yml` to verify the
fresh deploy). The manual commands below still exist for verifying a branch
*before* merging — the two don't conflict, one's pre-merge, one's post-merge.
See `CONTRIBUTING.md` for when to use the manual path.

Create `.env.staging` (gitignored, same shape as `.env.local`) with:

- The staging branch's connection string: `npx neon connection-string staging --pooled`
- The same `RESEND_API_KEY`/`KIT_API_KEY`/Kit tag IDs as production (no
  sandbox mode exists for either service — staging traffic is real traffic
  on those accounts)
- `OWNER_NOTIFICATION_EMAIL` set to an inbox you're fine getting staging
  notifications at
- `NEXT_PUBLIC_APP_URL=https://smiq-staging.<account>.workers.dev`
- Cloudflare's published Turnstile test keys instead of the production
  widget, so automated form submissions don't need a human to solve a
  captcha: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` /
  `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (verify
  against https://developers.cloudflare.com/turnstile/troubleshooting/testing/
  if in doubt — the secret key has more zeros than the sitekey, easy to
  miscount; `npx tsx -e` a quick siteverify call with the dummy token
  `XXXX.DUMMY.TOKEN.XXXX` is the fastest way to confirm)
- A dedicated `API_AUTH_TOKEN` (don't reuse production's)

```bash
npm run secrets:staging   # push every key in .env.staging to the Worker as a secret
npm run deploy:staging    # build (inlining .env.staging's NEXT_PUBLIC_* vars) + deploy
```

`deploy:staging` wraps the build in `dotenv-cli` so `.env.staging`'s values
win over `.env.local` for that one build — otherwise Next.js would silently
inline the production Turnstile site key instead. `secrets:staging` pushes
every key in the file (including the `NEXT_PUBLIC_*` ones) as a Worker
secret; those two specifically only matter at build time, not runtime, but
pushing them is harmless.

Branch and Worker provisioning: `npx neon branches create --name staging --parent production`
creates the DB branch; the Worker is created automatically the first time
`npm run secrets:staging` or `npm run deploy:staging` targets a Worker name
that doesn't exist yet.

---

## Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/smiq` | SMIQ survey form |
| `GET /api/smiq/responses` | Lists SMIQ responses. Requires `Authorization: Bearer <API_AUTH_TOKEN>`, 401s otherwise |

---

## Project structure

```
app/
  globals.css        # Design tokens + all component CSS
  layout.tsx         # Root layout (fonts, grain/glow overlays)
  page.tsx           # Landing page
  smiq/
    page.tsx         # /smiq server component shell
    SmiqForm.tsx     # Multi-step form (client component)
    actions.ts       # Server action — validates + inserts response
db/
  schema.ts          # Drizzle schema (smiq_responses table)
lib/
  db.ts              # Neon + Drizzle client
```

---

## Design system

Background `#0e0c09` · Surface `#15120d` · Gold `#c8922a` · Text `#e8dfd0`

Headings: Playfair Display · Body: Crimson Pro · Grain + radial gold glow overlays

---

## Security

The Anthropic API key is server-side only — never exposed to the browser. This was the central reason for the v1 → v2 rewrite.

---

## Milestones

- **M1** — Next.js scaffold, design tokens, Neon/Drizzle wired, landing page ported
- **M2** — SMIQ form: 4-step flow, segment picker, teacher branching, server action, success screen
- **M3** — Dashboard (private, auth-gated), AI analysis server-side *(pending)*
