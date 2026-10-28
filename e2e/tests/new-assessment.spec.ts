import { expect, test } from "@playwright/test";
import { makeNewAssessment } from "../fixtures/data";

// New Assessment form: validation on empty submit, and a full happy-path
// submission using dynamic data. Selectors verified against the live DOM
// (label-wrapped inputs → getByLabel; required marker is a literal " *").

test.describe("new assessment", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/new-assessment");
    await expect(page.getByRole("heading", { name: /Start a new risk assessment/i })).toBeVisible();
  });

  test("rejects an empty submission with required-field errors", async ({ page }) => {
    await page.getByRole("button", { name: "Submit request" }).click();

    // Summary banner (role=alert) — scope by its heading text since there are
    // multiple role=alert nodes (1 banner + 5 inline).
    await expect(
      page.getByRole("alert").filter({ hasText: /Submission rejected/ }),
    ).toBeVisible();

    // Representative inline field errors (each message appears twice — summary
    // list + inline <p role="alert"> — so match the first).
    await expect(page.getByText("Assessment title is required.").first()).toBeVisible();
    await expect(page.getByText(/Describe the change in at least 20 characters/).first()).toBeVisible();
    await expect(page.getByText(/Attach at least one source document/).first()).toBeVisible();

    // Still on the form (not navigated away).
    await expect(page).toHaveURL(/\/new-assessment$/);
  });

  test("submits a complete assessment with dynamic data", async ({ page }) => {
    const data = makeNewAssessment();

    await page.getByLabel("Assessment title *").fill(data.title);
    await page.getByLabel("Request owner *").fill(data.owner);
    await page.getByLabel("Change type *").selectOption(data.changeType);
    await page.getByLabel("Change summary *").fill(data.summary);

    // Attach a source document via the hidden file input (required field).
    // The app only accepts JPG/PNG/PDF/DOCX/XLSX (text/plain is rejected), so use a PDF.
    await page.locator('input[type="file"]').setInputFiles({
      name: `${data.title}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.4\nSource evidence for ${data.title}.\n%%EOF`),
    });

    await page.getByRole("button", { name: "Submit request" }).click();

    // Success confirmation shows a generated RA-#### reference and the entered owner.
    await expect(page.getByText(/Request RA-\d+ submitted/i)).toBeVisible();
    await expect(page.getByText(data.owner)).toBeVisible();
    // No validation banner on a valid submission.
    await expect(page.getByRole("alert").filter({ hasText: /Submission rejected/ })).toHaveCount(0);
  });

  test("blocks a change summary shorter than 20 characters", async ({ page }) => {
    const data = makeNewAssessment({ summary: "too short" });

    await page.getByLabel("Assessment title *").fill(data.title);
    await page.getByLabel("Request owner *").fill(data.owner);
    await page.getByLabel("Change type *").selectOption(data.changeType);
    await page.getByLabel("Change summary *").fill(data.summary);
    await page.getByRole("button", { name: "Submit request" }).click();

    await expect(page.getByText(/Describe the change in at least 20 characters/).first()).toBeVisible();
    await expect(page.getByText(/Request RA-\d+ submitted/i)).toHaveCount(0);
  });
});
