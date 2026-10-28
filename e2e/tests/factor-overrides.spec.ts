import { expect, test, type Locator, type Page } from "@playwright/test";

// Analyst OVERRIDE flows on the assessment detail page — the symmetric
// counterpart to the "Accept finding" coverage in committee-decision.spec.ts:
//   - Override with reason   (change the AI's inherent rating; counts toward sign-off)
//   - Override effectiveness  (change control effectiveness; does NOT count toward sign-off)
//   - reason-length validation (both panels reject a reason < 8 chars)
//
// Selectors verified against the live rendered DOM. Each override opens an INLINE
// panel inside that factor's <section> (one at a time), so we scope to the factor
// section (anchored on its "Factor N ·" H2) and locate the native <select> /
// <textarea> within it — getByLabel on the selects is unreliable because the
// wrapping <label>'s accessible name is polluted by the option text. We locate an
// Analyst-review assessment BY STAGE (not a hardcoded seed ref); state resets on
// reload, so each test starts from the assessment's seed stage.

/** Open the first Analyst-review assessment from the list; return its ref. */
async function openAnalystReviewAssessment(page: Page): Promise<string> {
  await page.goto("/?view=list");
  await page.getByLabel("Filter by stage").selectOption("Analyst review");
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: "Analyst review" }) })
    .first();
  await expect(row).toBeVisible();
  const ref = (await row.getByRole("cell", { name: /^RA-\d+$/ }).textContent())?.trim() ?? "";
  expect(ref, "expected an assessment in the Analyst review stage").toMatch(/^RA-\d+$/);
  await row.getByRole("link", { name: "Open" }).click();
  await expect(page).toHaveURL(new RegExp(`/assessment/${ref}$`));
  return ref;
}

/** The <section> for factor N (1-based), anchored on its "Factor N ·" heading. */
function factorSection(page: Page, n: number): Locator {
  return page.locator("section", {
    has: page.getByRole("heading", { name: new RegExp(`^Factor ${n} ·`) }),
  });
}

test.describe("factor override — inherent rating", () => {
  test("overriding a finding with a reason marks it Overridden and counts toward sign-off", async ({
    page,
  }) => {
    await openAnalystReviewAssessment(page);
    const factor = factorSection(page, 1);
    await expect(factor).toBeVisible();

    // Sign-off starts at 0 reviewed.
    await expect(page.getByText(/0\/\d+ reviewed/)).toBeVisible();

    await factor.getByRole("button", { name: "Override with reason" }).click();

    // Choose a rating (by option value) and give a reason (>= 8 chars required).
    await factor.locator("select").selectOption("High");
    await factor
      .getByLabel(/Why is the AI wrong\?/)
      .fill("Vendor has two years of monitored service with our card team.");
    await factor.getByRole("button", { name: "Save override" }).click();

    // The factor is now Overridden, with an audit line and the reason captured,
    // and the sign-off counter advances to 1 reviewed.
    await expect(factor.getByText("Overridden", { exact: true })).toBeVisible();
    await expect(factor.getByText(/Overridden .+ → .+ by .+/)).toBeVisible();
    await expect(factor.getByText(/^Reason: /)).toBeVisible();
    await expect(page.getByText(/1\/\d+ reviewed/)).toBeVisible();
  });

  test("rejects an override whose reason is shorter than the minimum", async ({ page }) => {
    await openAnalystReviewAssessment(page);
    const factor = factorSection(page, 1);

    await factor.getByRole("button", { name: "Override with reason" }).click();
    await factor.locator("select").selectOption("High");
    await factor.getByLabel(/Why is the AI wrong\?/).fill("too few"); // < 8 chars
    await factor.getByRole("button", { name: "Save override" }).click();

    // Panel stays open with the validation message; nothing is overridden.
    await expect(factor.getByText(/A reason is mandatory \(at least 8 characters\)/)).toBeVisible();
    await expect(factor.getByText("Overridden", { exact: true })).toHaveCount(0);
  });

  test("cancels an override without changing the finding", async ({ page }) => {
    await openAnalystReviewAssessment(page);
    const factor = factorSection(page, 1);

    await factor.getByRole("button", { name: "Override with reason" }).click();
    await expect(factor.locator("select")).toBeVisible();
    await factor.getByRole("button", { name: "Cancel" }).click();

    // Panel closes and the override controls are available again; not Overridden.
    await expect(factor.locator("select")).toHaveCount(0);
    await expect(factor.getByText("Overridden", { exact: true })).toHaveCount(0);
    await expect(factor.getByRole("button", { name: "Override with reason" })).toBeVisible();
  });
});

test.describe("factor override — control effectiveness", () => {
  test("overriding effectiveness updates the rating but does not count toward sign-off", async ({
    page,
  }) => {
    await openAnalystReviewAssessment(page);
    const factor = factorSection(page, 2);
    await expect(factor).toBeVisible();

    await expect(page.getByText(/0\/\d+ reviewed/)).toBeVisible();

    await factor.getByRole("button", { name: "Override effectiveness" }).click();
    await factor.locator("select").selectOption("Strong");
    await factor
      .getByLabel(/Why do you disagree with the AI's effectiveness\?/)
      .fill("Monitoring controls are mature and independently tested each quarter.");
    await factor.getByRole("button", { name: "Save effectiveness" }).click();

    // The effectiveness override is recorded (reason captured, human-override note),
    // but effectiveness overrides do NOT advance the sign-off gate.
    await expect(factor.getByText(/Human override; AI said (Strong|Moderate|Weak)/)).toBeVisible();
    await expect(factor.getByText(/^Reason: /)).toBeVisible();
    await expect(page.getByText(/0\/\d+ reviewed/)).toBeVisible();
  });

  test("rejects an effectiveness override whose reason is too short", async ({ page }) => {
    await openAnalystReviewAssessment(page);
    const factor = factorSection(page, 2);

    await factor.getByRole("button", { name: "Override effectiveness" }).click();
    await factor.locator("select").selectOption("Strong");
    await factor.getByLabel(/Why do you disagree with the AI's effectiveness\?/).fill("short");
    await factor.getByRole("button", { name: "Save effectiveness" }).click();

    await expect(factor.getByText(/A reason is mandatory \(at least 8 characters\)/)).toBeVisible();
  });
});
