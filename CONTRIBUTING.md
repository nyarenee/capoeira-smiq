# Git workflow

This project uses **trunk-based development** (a.k.a. GitHub Flow): `main`
is always deployable, and all work happens on short-lived branches that
merge back into it through a pull request. There is no `develop` branch, no
long-lived release branches, and no GitFlow-style branch hierarchy — the
team is small enough that the overhead isn't worth it, and `main` can ship
at any time via `npm run deploy` (see `README.md`).

## Branching model

- **`main`** is the trunk. It should always be in a shippable state.
- Every change — features, fixes, docs, dependency bumps — gets its own
  branch cut from the latest `main`. No exceptions, no direct commits to
  `main`, even for one-line fixes.
- Branch naming: `<type>/<short-description>`, e.g. `feat/smiq-form-i18n`,
  `fix/turnstile-token-reset`, `docs/git-branching-workflow`. Common types:
  `feat`, `fix`, `docs`, `chore`, `refactor`.
- Branches are short-lived — scoped to one reviewable change, merged within
  days, then deleted. If a branch is still open after a couple of weeks,
  either land it or close it; don't let it drift from `main`.

## Pre-commit hooks

`npm install` wires up a Husky pre-commit hook (via the `prepare` script) that
runs `lint-staged` on every commit:

- `*.{js,jsx,ts,tsx}` → `eslint --fix`, then `prettier --write`
- `*.{css,json,jsonc}` → `prettier --write`

It only touches staged files, auto-fixes what it can, and re-stages the
result — so most commits just pass silently. If `eslint --fix` can't resolve
something (a real lint error, not just style), the commit is blocked until
you fix it by hand. Markdown/docs are intentionally excluded (see
`.prettierignore`) — Prettier formats code, not prose.

The hook lives in `.husky/pre-commit`; the `lint-staged` config is in
`package.json`. If you ever need to bypass it (rare — e.g. committing a
work-in-progress snapshot on your own branch), `git commit --no-verify`, but
don't make that a habit.

## Pull requests

Every branch merges to `main` through a pull request — this is what makes
changes reviewable and gives each one a paper trail (what changed, why, how
it was tested).

- **Reviewers/approvals:** this is currently a one-developer team (with
  Claude Code assisting), so there's no mandatory second-human approval.
  The PR description's own test plan checklist is the review gate — fill it
  out honestly before merging, treat it the way you'd want a reviewer to.
  If a second person (e.g. a business partner reviewing copy changes) is
  available and the change touches user-facing content, ask them to look
  before merging — but it's not a hard requirement to merge.
- **Before opening a PR,** run the checks locally too — CI runs them on the
  PR (see `.github/workflows/ci.yml`), but it's not yet a required check
  (see Known gaps below), so don't rely on it alone. The pre-commit hook
  already covers lint/format on staged files as you go, but run the full
  set before opening the PR:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run format:check`
  - `npm test`
- **PR description** should include a short summary of *why*, plus a test
  plan (what you ran, what you checked manually in a browser if it's a UI
  change).
- **Merge method:** "Create a merge commit" (GitHub's default) — this
  matches the existing history (`Merge pull request #1`, `#2`, `#3`, ...).
  Don't squash or rebase-merge; keep the individual commits intact.
- **After merging:** delete the branch, both locally and on the remote.
  Sync your local `main` (`git pull --ff-only`) before starting the next
  branch.

## End-to-end walkthrough

```bash
git checkout main
git pull --ff-only origin main
git checkout -b feat/my-change

# ... make changes, commit in small focused chunks ...

npx tsc --noEmit && npm run lint && npm run format:check && npm test

git push -u origin feat/my-change
gh pr create   # fill in summary + test plan

# review your own diff, merge via GitHub (merge commit)

git checkout main
git pull --ff-only origin main
git branch -d feat/my-change
git push origin --delete feat/my-change
```

## Enforcement

A GitHub ruleset named **"Protect main"** targets `refs/heads/main` and
enforces part of the policy above at the repo level, not just by agreement:

- Pull request required before merging — no direct pushes, even trivial
  one-line fixes. There is no bypass, including for the repo owner.
- 0 required approvals, so a solo developer can still merge their own PRs.
- No force pushes (`non_fast_forward`) and no branch deletion.

## Known gaps / follow-ups

- **CI runs but isn't a required check yet** — `.github/workflows/ci.yml`
  runs typecheck/lint/format-check/test on every PR and on push to `main`,
  the same commands listed above. It's not wired into the "Protect main"
  ruleset as a required status check yet, so it's currently informational
  (red X is visible on the PR, but doesn't block merging). Adding "require
  status checks to pass" to the ruleset would turn it into an actual gate.
- **Staging environment** — not set up yet (see `PROJECT_NOTES.md`). Once it
  exists, this doc and the ruleset should be revisited (e.g. a required
  staging deploy/check before merging to `main`).
