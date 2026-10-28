import { expect, test, type Page } from "@playwright/test";

// Assessment detail page tabs. The detail page is reached by opening a row from
// the list (dynamic RA-#### ref — never hardcoded). Its tabs are plain <button>
// elements (NOT role="tab"): "Overview", "Evidence · N", "Controls · N",
// "Audit history". Each selects a region with a unique h2. "Audit history"
// exists both as a tab button and an Overview section h2, so tab clicks are
// qualified by role=button and the revealed content by role=heading.
// Selectors verified against the live rendered DOM.

/** Open the first assessment from the list view and return its RA-#### ref. */
async function openFirstAssessment(page: Page): Promise<string> {
  await page.goto("/?view=list");
  const refCell = page.getByRole("cell", { name: /^RA-\d+$/ }).first();
  await expect(refCell).toBeVisible();
  const ref = (await refCell.textContent())?.trim() ?? "";
  expect(ref).toMatch(/^RA-\d+$/);
  await page.getByRole("row", { name: new RegExp(ref) }).getByRole("link", { name: "Open" }).click();
  await expect(page).toHaveURL(new RegExp(`/assessment/${ref}$`));
  return ref;
}

test.describe("assessment detail tabs", () => {
  test("opens the Overview tab by default with source evidence", async ({ page }) => {
    await openFirstAssessment(page);
    // Overview is active on load; "Source evidence" is its stable first section.
    await expect(page.getByRole("heading", { name: "Source evidence" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
  });

  test("switches to the Evidence tab and shows the document viewer", async ({ page }) => {
    await openFirstAssessment(page);
    // Tab label carries a dynamic count ("Evidence · 10") → regex name.
    await page.getByRole("button", { name: /^Evidence/ }).click();
    await expect(page.getByRole("heading", { name: "Document viewer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence register" })).toBeVisible();
  });

  test("switches to the Controls tab and shows the control plan", async ({ page }) => {
    const ref = await openFirstAssessment(page);
    await page.getByRole("button", { name: /^Controls/ }).click();
    // Control-plan heading embeds the ref ("Control plan · RA-####").
    await expect(
      page.getByRole("heading", { name: new RegExp(`Control plan · ${ref}`) }),
    ).toBeVisible();
  });

  test("switches to the Audit history tab and shows the full history", async ({ page }) => {
    await openFirstAssessment(page);
    // Qualify by role: a tab BUTTON named "Audit history" (an h2 shares the text).
    await page.getByRole("button", { name: "Audit history" }).click();
    await expect(page.getByRole("heading", { name: "Complete audit history" })).toBeVisible();
  });

  test("returns to Overview after visiting another tab", async ({ page }) => {
    await openFirstAssessment(page);
    await page.getByRole("button", { name: /^Evidence/ }).click();
    await expect(page.getByRole("heading", { name: "Document viewer" })).toBeVisible();
    await page.getByRole("button", { name: "Overview" }).click();
    await expect(page.getByRole("heading", { name: "Source evidence" })).toBeVisible();
  });
});
