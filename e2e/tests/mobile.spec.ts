import { expect, test } from "@playwright/test";

// Mobile-viewport smoke coverage. Verified against the live DOM: the sidebar nav
// is `hidden lg:flex` (no hamburger/menu button below the lg breakpoint), so on a
// phone viewport the nav links aren't reachable — mobile users/tests navigate by
// URL. The assessments table stays a semantic <table> (wrapped in an
// overflow-x-auto scroller, not swapped for cards). These tests pin an
// iPhone-class viewport so they run under whichever browser project is active
// (chromium/firefox/webkit) rather than forcing a single engine.

// iPhone-class viewport only. We intentionally do NOT use devices["iPhone 13"]
// (it pins defaultBrowserType: webkit) nor isMobile/hasTouch (chromium-only
// options that throw under firefox/webkit) — pinning the viewport alone is what
// exercises the responsive layout and keeps these specs runnable on every project.
test.use({ viewport: { width: 390, height: 844 } });

test.describe("mobile viewport", () => {
  test("renders the dashboard greeting and assessments table on a phone", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Good (morning|afternoon|evening),/ }),
    ).toBeVisible();
    // Table is not replaced by cards on mobile — it stays a scrollable <table>.
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "ASSESSMENT" })).toBeVisible();
    await expect(page.getByRole("cell", { name: /^RA-\d+$/ }).first()).toBeVisible();
  });

  test("reaches each section by URL (no mobile nav/hamburger exists)", async ({ page }) => {
    await page.goto("/?view=committee");
    await expect(page.getByRole("heading", { name: "Committee agenda" })).toBeVisible();

    await page.goto("/?view=policies");
    await expect(page.getByRole("button", { name: "View policy" }).first()).toBeVisible();
  });

  test("renders the new-assessment form fields on a phone viewport", async ({ page }) => {
    await page.goto("/new-assessment");
    await expect(page.getByRole("heading", { name: /Start a new risk assessment/i })).toBeVisible();
    // All required inputs stay reachable on a narrow viewport (the form is the
    // key mobile write-path; submit/validation itself is covered on desktop in
    // new-assessment.spec.ts — re-submitting here only duplicates it and races a
    // dismissible toast overlay).
    await expect(page.getByLabel("Assessment title *")).toBeVisible();
    await expect(page.getByLabel("Request owner *")).toBeVisible();
    await expect(page.getByLabel("Change type *")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit request" })).toBeVisible();
  });
});
