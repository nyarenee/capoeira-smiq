# Capoeira International — SMIQ Funnel
### Product Requirements Document

Status: v2 rebuild in progress (M1/M2 shipped, M3 not started) · Last updated 2026-09-17

---

## 1. Vision

Capoeira International (run by Malta Capoeira) exists to understand the global Capoeira community on its own terms, not to sell to it. The SMIQ ("Single Most Important Question") funnel is a lightweight research instrument: it segments a visitor by their relationship to the art in one click, then asks the one open-ended question that matters most to someone in that position. No resource is promised, no course is pitched — the entire value exchange is "tell us your biggest challenge, and we'll actually read it."

The product's job is twofold:

1. **Collection** — make it effortless and trustworthy for practitioners, students, teachers, and people who've stepped away from the art to share their single biggest challenge or reason for leaving, in their own words.
2. **Synthesis** — give the Capoeira International team (currently just the owner) a private, AI-assisted way to read hundreds of open-text answers and surface the 3–5 real themes per segment, so community strategy is built on what people actually said rather than assumption.

The rebuild (v1 → v2) exists for one reason above all others: v1 called the Anthropic API directly from browser JavaScript, exposing the API key to anyone who viewed source. v2 must never recreate that. Every other v2 decision (Next.js, Cloudflare Workers, Neon, Resend) is in service of shipping the same honest, community-first funnel on a foundation that keeps secrets server-side and is easy to keep building on.

---

## 2. User Personas

Five visitor-facing personas, defined by the segment picker, plus one internal persona.

| Persona | Segment key | Who they are | What they need from the funnel |
|---|---|---|---|
| **The Curious One** 🌱 | `curious` | New or exploring — hasn't trained regularly yet | A low-pressure way to voice what's stopping them from starting, without being sold a trial class |
| **The Student** 🎵 | `student` | Training consistently, learning the ropes and music | To flag what's actually slowing their progress — technique, cost, time, community — without judgment |
| **The Practitioner** 🌀 | `practitioner` | Years of training, playing rodas, deepening their art | A space to articulate the more advanced frustration (plateau, injury, scene fragmentation) that beginner-focused content ignores |
| **The Teacher** 🪘 | `teacher` | Mestre, instructor, or building their own group/school | To be asked a teaching-and-growth-specific question, and to have their teaching situation and graduation level captured so their answer is read in context |
| **The One Who Left** 🌙 | `lapsed` | Trained before, stepped away — life, injury, or something else pulled them out | To be asked *why they left*, not why they should come back — treated as a non-teacher, given a more reflective success message than the other four |
| **The Owner** (internal) | — | Paul, running Capoeira International for Malta Capoeira | A private, auth-gated dashboard that turns raw open-text answers into per-segment themes with quotes and percentages, without having to read every row by hand or query Neon directly. Wants an at-a-glance email the moment a real (confirmed) response comes in |

---

## 3. Feature List

### Must-Have

*Funnel (shipped, M1/M2):*
- Segment picker — 5 segments, exact SMIQ wording preserved per `PROJECT_CONTEXT.md`
- Segment-specific SMIQ open-text question, teacher-only branching step (teaching situation + graduation level), name/email capture
- Double opt-in via Resend — a response is provisional (`pending_smiq_submissions`) until the visitor confirms by email; only confirmed rows land in `smiq_responses`
- Cloudflare Turnstile bot protection on submission
- Kit (ConvertKit) subscribe-on-confirm, tagged by teaching role / graduation level / language
- Owner notification email on confirm — segment, answer, role/grad, language, timestamp, sent via `after()` so a Resend failure never blocks the visitor's redirect
- EN/PT/ES/FR localization (next-intl)
- Design system compliance (§5) across every screen
- Server-side-only Anthropic key, once AI features exist — no exceptions, ever

*Dashboard (M3, not started):*
- Auth gate — no production deploy of any dashboard route without it (inviolable rule, CLAUDE.md)
- Load + filter confirmed responses by segment and volume
- Server-side AI analysis call producing the existing v1 JSON contract (`strategicSummary` + per-segment `themes[]` with `name`/`pct`/`insight`/`quote`), 3–5 themes per segment
- Raw response table view as a fallback to the AI summary

### Should-Have

- Lapsed segment included in dashboard filters and stats (v1 explicitly missed this — don't repeat it)
- ~~Staging environment — separate Neon branch + preview deploy, so testing stops happening in prod~~ — done 2026-10-02, see `PROJECT_NOTES.md` "Staging environment"
- Structured logging / basic error visibility around the confirm → Kit → owner-notification chain, beyond `console.error`
- Deploy/prod-parity check as part of the release habit — `main` has drifted ahead of the live Worker before; a lightweight way to see that at a glance would prevent shipping surprises
- Custom domain (currently `*.workers.dev`)

### Nice-to-Have

- Migration or archival of the 0–10 legacy v1 responses (low volume — may not be worth the effort)
- Retries/fallback/timeout handling around the Anthropic call once the dashboard exists (PROJECT_NOTES Phase 3)
- A small evaluation set of expected dashboard outputs, so prompt changes can be checked for regressions
- Feature flags for AI behavior that's still being tuned
- Prompt versioning / changelog, separated from orchestration code

---

## 4. Technical Constraints

- **Hosting:** Cloudflare Workers via `@opennextjs/cloudflare` (moved off Vercel 2026-07-21). No `next/image`, no filesystem access, no edge-runtime-only APIs that don't run in Workers.
- **Framework:** Next.js (App Router). This is a customized build — **read `node_modules/next/dist/docs/` before writing framework code that leans on prior Next.js knowledge**; conventions here may differ from training data (see `AGENTS.md`).
- **Database:** Neon Postgres, plain connection string, accessed via `@neondatabase/serverless` (HTTP driver — this is *why* Cloudflare Workers was a viable move; no persistent TCP connection needed). Drizzle ORM (`drizzle-orm/neon-http`).
- **Email:** Resend, one integration point (`lib/email.ts`) for all transactional email — confirmation and owner-notification both live there; any new email type should extend that file, not introduce a second provider.
- **Bot protection:** Cloudflare Turnstile, verified server-side.
- **Localization:** next-intl, locale content in `messages/*.json`; adding a language means adding a message file, not new routing logic.
- **AI:** Anthropic API, server-side only, key in env vars, never logged. This is the one rule the entire rebuild exists to enforce.
- **Secrets:** env vars only (`.env.local` / `.dev.vars` locally, Worker secrets via `npx wrangler secret bulk .env.local` in prod) — never committed, never logged. New env vars must be documented in `README.md`.
- **Writes:** every write path goes through a server action or route handler — no client-side direct-to-database calls (the v1 Supabase-anon-key pattern is explicitly not carried forward).
- **Deploy discipline:** `npm run deploy` does not run automatically on merge — `main` can sit ahead of the live Worker. Check `npx wrangler deployments list --name smiq` rather than assuming a merged commit is live, especially when it ships a new secret.

---

## 5. Design Standard (summary)

One consistent system across landing page, funnel, and (eventually) dashboard.

**Color tokens:**

| Token | Value | Usage |
|---|---|---|
| Background | `#0e0c09` | Page background |
| Card surface | `#15120d` | Card backgrounds |
| Gold (primary) | `#c8922a` | Accent, CTAs, headings |
| Gold light | `#e8b84b` | Hover states |
| Gold muted | `#6b4d1a` | Borders, subtle accents |
| Text | `#e8dfd0` | Body copy |
| Text muted | `#8a7a65` | Secondary text |
| Text dim | `#4a3f30` | Placeholders, hints |

**Typography:** Playfair Display (700/900) for headings, Crimson Pro (300/400/600) for body text, JetBrains Mono reserved for dashboard labels/data only.

**Texture:** SVG grain overlay + radial gold glow atmosphere on every screen.

**Segment color coding** (used consistently in UI and dashboard):
Curious `#c8922a` gold · Student `#4f8ef7` blue · Practitioner `#9b6fd4` purple · Teacher `#e8843a` orange · Lapsed `#7a8fa6` steel blue.

**Tone of voice:** Community-first, honest, warm. No sales language. No promises of resources, guides, or follow-up content that won't actually be delivered — the funnel's entire premise is "we're asking because we want to understand you," and copy must never contradict that.

---

## 6. Success Criteria

**Funnel health**
- Confirm rate: % of `pending_smiq_submissions` that convert to `smiq_responses` within the 24-hour token window — the double opt-in step is the biggest drop-off risk and should be watched first
- Step-through rate across the 3–4 step form (segment → SMIQ answer → [teacher detail] → name/email), by segment
- Zero false-positive Turnstile blocks reported by real visitors

**Data quality / coverage**
- All five segments represented in confirmed responses — Lapsed in particular, since it was under-served in the dashboard in v1
- Teacher responses carry both teaching role and graduation level on 100% of confirmed teacher rows (both fields are required to continue)

**Operational**
- Owner notification email delivered for every confirmed response, with zero visitor-facing failures caused by a notification-send error (the `after()` isolation is the mechanism; success criterion is that it's never violated)
- `main` and the live Worker deployment don't silently diverge — deploys happen deliberately, not by discovery

**Security**
- Anthropic API key never appears in any browser-delivered bundle or log, for the lifetime of the project — this is the non-negotiable bar the entire v2 rebuild was commissioned to clear
- Dashboard is never reachable in production without auth in front of it, from the moment it first ships

**Dashboard value (once M3 ships)**
- Strategic summary and per-segment themes are specific enough to act on — each theme carries a real, attributable quote, not a paraphrase
- Owner can go from "new responses came in" (notification email) to "here's what people are actually saying" (dashboard) without touching Neon directly, closing the loop the entire funnel was built to serve
