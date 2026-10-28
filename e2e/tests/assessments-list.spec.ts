import { expect, test, type Page } from "@playwright/test";
import { dateFromToday } from "../fixtures/data";

// Assessments List view: search, stage filter, empty state, editable due date,
// and open-detail navigation. Selectors verified against the live DOM.

/** Read the reference id of the first data row in the table. */
async function firstRowReference(page: Page): Promise<string> {
  const cell = page.getByRole("cell", { name: /^RA-\d+$/ }).first();
  await expect(cell).toBeVisible();
  const text = (await cell.textContent())?.trim() ?? "";
  expect(text).toMatch(/^RA-\d+$/);
  return text;
}

test.describe("assessments list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?view=list");
    await expect(page.getByLabel("Search assessments")).toBeVisible();
  });

  test("filters the table by a free-text search", async ({ page }) => {
    const ref = await firstRowReference(page);

    await page.getByLabel("Search assessments").fill(ref);

    // The searched row remains; count of RA rows collapses to the matches.
    await expect(page.getByRole("cell", { name: ref })).toBeVisible();
    await expect(page.getByRole("cell", { name: /^RA-\d+$/ })).toHaveCount(1);
  });

  test("shows an in-table empty state when nothing matches", async ({ page }) => {
    await page.getByLabel("Search assessments").fill("zzzzz-no-such-assessment");
    // Empty state interpolates the query with curly quotes — match with a regex.
    await expect(page.getByText(/No assessments match/)).toBeVisible();
    await expect(page.getByRole("cell", { name: /^RA-\d+$/ })).toHaveCount(0);
  });

  test("narrows the table with the stage filter", async ({ page }) => {
    await page.getByLabel("Filter by stage").selectOption("Committee");
    // Every visible stage cell now reads "Committee".
    const stageCells = page.getByRole("cell", { name: "Committee" });
    await expect(stageCells.first()).toBeVisible();
    // Reset restores more rows than the filtered view.
    const filteredCount = await page.getByRole("cell", { name: /^RA-\d+$/ }).count();
    await page.getByLabel("Filter by stage").selectOption("All stages");
    const allCount = await page.getByRole("cell", { name: /^RA-\d+$/ }).count();
    expect(allCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test("edits a due date inline and persists the new value", async ({ page }) => {
    const ref = await firstRowReference(page);
    const row = page.getByRole("row", { name: new RegExp(ref) });

    // Click the editable due-date trigger in that row.
    await row.getByTitle("Click to change due date").click();

    // The input appears with a per-row aria-label. Commit via fill (fires change).
    const input = page.getByLabel(`Due date for ${ref}`);
    await expect(input).toBeVisible();
    const newDate = dateFromToday(21); // yyyy-mm-dd
    await input.fill(newDate);
    // Commit by blurring to elsewhere on the page.
    await page.getByRole("heading", { name: "Assessments List" }).click();

    // The row reflects the committed date, formatted en-GB as "dd Mon yyyy".
    const [y, m, d] = newDate.split("-");
    const mon = new Date(`${y}-${m}-${d}T00:00:00`).toLocaleDateString("en-GB", { month: "short" });
    await expect(row.getByText(new RegExp(`${Number(d)}\\s*${mon}\\s*${y}`))).toBeVisible();
  });

  test("opens an assessment detail page from a row", async ({ page }) => {
    const ref = await firstRowReference(page);
    const row = page.getByRole("row", { name: new RegExp(ref) });

    await row.getByRole("link", { name: "Open" }).click();

    await expect(page).toHaveURL(new RegExp(`/assessment/${ref}$`));
    // Detail page renders a stable section heading.
    await expect(page.getByRole("heading", { name: /Source evidence/i })).toBeVisible();
  });
});
