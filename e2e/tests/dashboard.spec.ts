import { expect, test } from "@playwright/test";

// Dashboard loads and renders the core workbench shell.
// Selectors verified against the live rendered DOM (semantic table, aria labels).

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the greeting, metrics, and assessments table", async ({ page }) => {
    // Greeting word (morning/afternoon/evening) is dynamic — match with a regex.
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening),/ })).toBeVisible();

    // The three summary metric cards (no roles — assert on their label text).
    await expect(page.getByText("Needs your review")).toBeVisible();
    await expect(page.getByText("AI processing")).toBeVisible();
    await expect(page.getByText("Committee ready")).toBeVisible();

    // Real semantic table with the expected column headers.
    await expect(page.getByRole("table")).toBeVisible();
    for (const header of ["REFERENCE", "ASSESSMENT", "RISK", "STAGE", "OWNER", "DUE"]) {
      await expect(page.getByRole("columnheader", { name: header })).toBeVisible();
    }

    // At least one assessment row with an RA-#### reference is present.
    await expect(page.getByRole("cell", { name: /RA-\d+/ }).first()).toBeVisible();
  });

  test("New Assessment link navigates to the create form", async ({ page }) => {
    // The link renders more than once (nav + hero) — scope to the first.
    await page.getByRole("link", { name: "New Assessment" }).first().click();
    await expect(page).toHaveURL(/\/new-assessment$/);
    await expect(page.getByRole("heading", { name: /Start a new risk assessment/i })).toBeVisible();
  });

  test("no app console errors on initial load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      // Ignore hosting/CDN noise that is not an app defect and is browser-specific
      // (Firefox logs a Cloudflare __cf_bm cookie-domain rejection for the Lovable
      // preview host that Chromium does not). The app's own errors still fail this.
      if (/__cf_bm|cookie .*rejected|cloudflare/i.test(text)) return;
      errors.push(text);
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening),/ })).toBeVisible();
    expect(errors, `console errors: ${errors.join(" | ")}`).toHaveLength(0);
  });
});
