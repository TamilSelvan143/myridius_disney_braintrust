import { expect, test } from "@playwright/test";

// The dashboard is a single SPA whose sections are selected by a ?view= query
// param and the left-nav links. These specs drive each view end-to-end — via the
// nav link (proving the link works) and asserting a heading/text unique to that
// view. Selectors verified against the live rendered DOM:
//   - nav links are real <a> (getByRole link); "New Assessment" renders twice.
//   - Committee / Audit / Policies / Requests use card layouts, not tables.
//   - Some section titles are <b>, not headings — anchor on the real unique h2
//     or on stable body text where a view has no heading (Requests).

test.describe("dashboard views", () => {
  test("navigates to the Committee agenda from the nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Committee" }).click();
    await expect(page).toHaveURL(/\?view=committee$/);
    await expect(page.getByRole("heading", { name: "Committee agenda" })).toBeVisible();
    // Each committee card exposes a "Review & vote" link into the detail page.
    await expect(page.getByRole("link", { name: "Review & vote" }).first()).toBeVisible();
  });

  test("navigates to the Audit Ledger from the nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Audit Ledger" }).click();
    await expect(page).toHaveURL(/\?view=audit$/);
    // "Audit Ledger" itself is a <b>, not a heading — anchor on the real h2.
    await expect(page.getByRole("heading", { name: "What the Audit Ledger stores" })).toBeVisible();
    // Ledger rows link into each assessment's history (dynamic text → regex).
    await expect(page.getByRole("link", { name: /Open history/ }).first()).toBeVisible();
  });

  test("navigates to the Policies view from the nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Policies" }).click();
    await expect(page).toHaveURL(/\?view=policies$/);
    // Each policy name is its own h2; at least one policy card is present.
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    // Policy cards expose a "View policy" action (renders once per policy).
    await expect(page.getByRole("button", { name: "View policy" }).first()).toBeVisible();
  });

  test("navigates to the Product Owner requests view from the nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "My requests (PO)" }).click();
    await expect(page).toHaveURL(/\?view=requests$/);
    // This view has no heading elements — anchor on its stable descriptive text.
    await expect(page.getByText("Read-only status for Product Owners.")).toBeVisible();
  });

  test("deep-links directly into each view via the query param", async ({ page }) => {
    await page.goto("/?view=committee");
    await expect(page.getByRole("heading", { name: "Committee agenda" })).toBeVisible();

    await page.goto("/?view=audit");
    await expect(page.getByRole("heading", { name: "What the Audit Ledger stores" })).toBeVisible();

    await page.goto("/?view=policies");
    await expect(page.getByRole("button", { name: "View policy" }).first()).toBeVisible();

    await page.goto("/?view=requests");
    await expect(page.getByText("Read-only status for Product Owners.")).toBeVisible();
  });
});
