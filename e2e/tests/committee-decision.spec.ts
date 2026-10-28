import { expect, test, type Page } from "@playwright/test";

// The core governance workflow — the write-path that neither the jsdom unit layer
// (server-fn/AsyncLocalStorage limits) nor the read-only detail-tab spec exercises:
//   analyst review → accept all findings → send to committee → committee vote →
//   record decision, plus the "needs information" stage send-back.
//
// Selectors verified against the live rendered DOM. Dynamic-data principle: we do
// NOT hardcode a seed RA-#### — we locate an assessment BY ITS STAGE (the flow is
// only reachable from specific stages) and read its generated ref from the table,
// so the specs survive seed changes. In-app state is in-memory for the session and
// resets on reload, so each test starts from the assessment's seed stage.

const COMMITTEE_MEMBERS = ["J. Howard (Chair)", "L. Okafor", "P. Novak"] as const;

/** Open the first assessment whose Stage cell matches `stage`; return its ref. */
async function openAssessmentAtStage(page: Page, stage: string): Promise<string> {
  await page.goto("/?view=list");
  await expect(page.getByLabel("Filter by stage")).toBeVisible();
  // Narrow the table to the target stage so we pick a row that exposes the flow.
  await page.getByLabel("Filter by stage").selectOption(stage);
  const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: stage }) }).first();
  await expect(row).toBeVisible();
  const refCell = row.getByRole("cell", { name: /^RA-\d+$/ });
  const ref = (await refCell.textContent())?.trim() ?? "";
  expect(ref, `expected an assessment in the "${stage}" stage`).toMatch(/^RA-\d+$/);
  await row.getByRole("link", { name: "Open" }).click();
  await expect(page).toHaveURL(new RegExp(`/assessment/${ref}$`));
  return ref;
}

/** Accept every AI finding (one "Accept finding" button per factor). */
async function acceptAllFindings(page: Page): Promise<void> {
  const accepts = page.getByRole("button", { name: "Accept finding" });
  // Wait for the detail page's factors to render before counting (navigation
  // completes before the factor section mounts).
  await expect(accepts.first()).toBeVisible();
  const count = await accepts.count();
  expect(count, "expected at least one factor to accept").toBeGreaterThan(0);
  // Accept each in turn; the buttons stay present after accepting, so index by
  // position and let the sign-off counter be the source of truth.
  for (let i = 0; i < count; i++) {
    await accepts.nth(i).click();
  }
  // Sign-off gate reads "N/N reviewed" once all factors are reviewed.
  await expect(page.getByText(new RegExp(`${count}\\/${count} reviewed`))).toBeVisible();
}

test.describe("committee decision workflow", () => {
  test("analyst accepts all findings, which unlocks Send to Committee", async ({ page }) => {
    await openAssessmentAtStage(page, "Analyst review");

    const send = page.getByRole("button", { name: "Send to Committee" });
    // Gated before review is complete.
    await expect(send).toBeDisabled();

    await acceptAllFindings(page);

    // Unlocks once every finding is reviewed.
    await expect(send).toBeEnabled();
  });

  test("sends an analyst-reviewed assessment to committee", async ({ page }) => {
    await openAssessmentAtStage(page, "Analyst review");
    await acceptAllFindings(page);

    await page.getByRole("button", { name: "Send to Committee" }).click();

    // Stage advances to Committee and the vote control unlocks.
    await expect(page.getByText("Committee", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Open committee vote" })).toBeEnabled();
  });

  test("records a committee decision via the vote dialog", async ({ page }) => {
    // A Committee-stage assessment exposes the vote directly (no send step needed).
    await openAssessmentAtStage(page, "Committee");

    await page.getByRole("button", { name: "Open committee vote" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Committee vote" })).toBeVisible();

    // Cast an "Approved" vote for every committee member (quorum = 3).
    for (const member of COMMITTEE_MEMBERS) {
      await page.getByLabel(`Vote for ${member}`).selectOption("Approved");
    }
    // Decision rationale is required (label-wrapped textarea; match loosely).
    await page.getByLabel(/Decision rationale/).fill("Approved — controls are adequate for the stated risk.");

    await page.getByRole("button", { name: "Record decision" }).click();

    // Dialog closes; stage becomes Decision; the recorded outcome is shown.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Decision", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Recorded:\s*Approved/)).toBeVisible();
  });
});

test.describe("needs-information send-back", () => {
  test("requests more information, moving the assessment to Needs information", async ({ page }) => {
    await openAssessmentAtStage(page, "Analyst review");

    // "Request more information" transitions the stage immediately (no dialog).
    await page.getByRole("button", { name: "Request more information" }).click();

    await expect(page.getByText("Needs information", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Missing information requested from the requester")).toBeVisible();
  });

  test("resumes analyst review after information is received", async ({ page }) => {
    await openAssessmentAtStage(page, "Analyst review");
    await page.getByRole("button", { name: "Request more information" }).click();
    await expect(page.getByText("Needs information", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: /Mark information received/ }).click();

    // Back in Analyst review with the review controls available again.
    await expect(page.getByText("Analyst review", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Send to Committee" })).toBeVisible();
  });
});
