# E2E (Playwright) — Risk Assessment Workbench

Browser-level end-to-end tests that drive a **real browser against the deployed site**.
Complements the in-repo Vitest unit/component suite (which runs the app in jsdom).

> **Temporary / preview-targeted.** This suite currently points at the Lovable preview
> URL. When the app moves to its custom domain, set `BASE_URL` (see below) — no spec
> changes needed. It is intentionally self-contained in `e2e/` and not wired into the
> app's `npm run verify`.

## Run

```bash
cd e2e
npm install
npx playwright install        # one-time: download browsers
npm test                      # runs against the default BASE_URL
```

Point at a different environment (e.g. the future custom domain):

```bash
BASE_URL=https://risk.example.com npm test
```

Other scripts: `npm run test:headed`, `npm run report` (open last HTML report),
`npm run codegen` (record against `$BASE_URL`).

## What it covers

- **dashboard.spec.ts** — greeting, the three metric cards, the assessments table +
  column headers, New Assessment navigation, and a no-app-console-errors load check
  (hosting/CDN cookie noise filtered out).
- **dashboard-views.spec.ts** — each `?view=` section driven via the left-nav link
  **and** by direct deep-link: Committee agenda, Audit Ledger, Policies, and the
  Product Owner requests view.
- **assessments-list.spec.ts** — free-text search, in-table empty state, stage filter,
  inline editable due-date, and open-detail navigation.
- **assessment-detail.spec.ts** — the detail-page tabs (Overview / Evidence / Controls /
  Audit history), each reached from a dynamic `RA-####` row and asserted on its unique
  section heading, plus return-to-Overview.
- **committee-decision.spec.ts** — the core governance write-path: analyst **accepts all
  findings** (which unlocks Send to Committee), **sends to committee**, opens the vote
  dialog and **records a committee decision** (per-member votes + rationale → stage
  becomes Decision), plus the **needs-information** send-back and resume.
- **factor-overrides.spec.ts** — the analyst **override** flows (counterpart to accept):
  **Override with reason** (changes the AI's inherent rating → factor marked Overridden,
  counts toward sign-off), **Override effectiveness** (changes control effectiveness →
  does NOT count toward sign-off), the shared ≥8-char **reason-length validation**, and
  cancel.
- **new-assessment.spec.ts** — empty-submit validation (banner + inline), a full
  happy-path submission with a file upload, and the <20-char summary guard.
- **mobile.spec.ts** — an iPhone-class viewport (390×844): dashboard + table render,
  by-URL navigation (the sidebar is `hidden lg:flex`, so there is no mobile hamburger),
  and the new-assessment form fields.

**34 tests across 8 spec files.** Verified green on **chromium** (34/34) and **firefox**
(occasional live-site flake auto-absorbed by a retry). The **webkit** project is declared
in the config but was not run here (the webkit browser download was unavailable in this
environment) — `npx playwright install webkit` enables it with no spec changes.

## Cross-browser

`playwright.config.ts` declares `chromium`, `firefox`, and `webkit` projects. Because the
suite targets a **live remote site over the network**, transient load/latency flake is
expected, so `retries` is enabled locally (1) and in CI (2) — a genuinely broken spec
still fails after its retries, but a one-off network hiccup is absorbed. Run a single
engine with `--project=chromium` (or `firefox` / `webkit`).

## Conventions

- **Dynamic data** (`fixtures/data.ts`) — generated per run; no hardcoded seed values,
  so specs survive seed changes and the domain move.
- **Stable locators** — role/label/text based (the app ships no `data-testid`); the
  app does expose real `<table>`, `<select>`, and `aria-label`s.
- Gotchas baked in: dynamic greeting word (regex), curly-quote empty state (regex),
  non-unique `role="alert"` (filtered), duplicate "New Assessment" link (`.first()`),
  date inputs committed via `.fill()`.
