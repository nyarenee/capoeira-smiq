# Capoeira SMIQ Funnel

Single-most-important-question survey for the global Capoeira community.
Branded "Capoeira International," run by Malta Capoeira.

- **Live (v1):** https://maltascapoeira.github.io/smiq/
- **Live (v2):** https://smiq.capoeirainternational.workers.dev — note that
  `main` can be ahead of what's deployed; check `npx wrangler deployments list
  --name smiq` before assuming a merged commit is live, and run `npm run
  deploy` (+ `npx wrangler secret bulk .env.local` if env vars changed) to
  ship it
- **Repo:** github.com/nyarenee/capoeira-smiq
- **Owner:** MALTAS

## Stack (v2 rebuild in progress)

- **Next.js** (App Router) on **Cloudflare Workers** (via `@opennextjs/cloudflare`,
  moved from Vercel 2026-07-21 — see `PROJECT_NOTES.md`)
- **Neon Postgres** (plain connection string; was via Vercel marketplace, now direct)
- **Resend** — double opt-in confirmation emails and owner notification emails
  (`lib/email.ts`) are live. Magic-link auth for the dashboard is still just
  the likely plan, not built — there is no dashboard yet (see Milestones below)
- **Cloudflare Turnstile** for bot protection on the SMIQ form
- **Kit (ConvertKit)** subscribes confirmed respondents, tagged by role/grad/lang
- **next-intl** for EN/PT/ES/FR — locale content in `messages/*.json`
- All Anthropic API calls server-side, key in env vars only

V1 exposed the Anthropic key in browser code. That is the central reason for
the rewrite. Don't recreate it.

## Milestones

- **M1** — Next.js scaffold, design tokens, Neon/Drizzle wired, landing page ✓
- **M2** — SMIQ form, segment routing, confirm email, Turnstile, Kit, i18n ✓
- **M3** — Dashboard (private, auth-gated), AI analysis server-side — **not
  started**. No dashboard code exists in the repo yet. Groundwork only:
  `GET /api/smiq/responses` exists, gated by a shared-secret bearer token
  (`lib/api-auth.ts`), not wired to any UI.

## Reference docs

- `PROJECT_CONTEXT.md` — full v1 build (architecture, segment copy, history)
- `PROJECT_NOTES.md` — living memory. Update it when a real decision is made.

## Inviolable rules

1. Anthropic API key is server-side only. No exceptions.
2. The dashboard is private. Auth before any production deploy.
3. Preserve the five segments and their exact SMIQ wording (see
   `PROJECT_CONTEXT.md`). The Lapsed segment routes as a non-teacher and gets
   different success copy.
4. Tone is community-first. No sales language, no resource promises that
   won't be delivered.
5. Design system: MALTAS institutional brand (see `manual_marca_maltas.pdf`).
   White background, black primary text. Blue `#213a8f` for structural/nav/
   headings/links. Yellow `#fbba00` reserved exclusively for the primary CTA
   button — never used elsewhere. Gray `#706f6f` for secondary text/borders.
   Green `#18ab70` for success states, red `#e30613` for errors. Raleway
   (display/headings) + Carlito as a Calibri substitute (body/UI, stack:
   `Calibri, Carlito, system-ui, sans-serif`). Flat backgrounds — no grain
   texture, no glow/gradient effects.

## Conventions

- TypeScript everywhere
- Server actions or route handlers for every write
- Secrets in env vars — never committed, never logged
- Small, focused commits
- Branching, PR, and merge rules: see `CONTRIBUTING.md`

## Next.js notes

@AGENTS.md
