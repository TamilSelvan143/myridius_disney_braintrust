import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { assessments } from "@/components/risk-guardian";

// Behavioural coverage of the workbench UI (risk-guardian.tsx) through the real
// router — the same harness app-routing.test.tsx uses, but asserting on CONTENT
// and INTERACTIONS, not just that something painted.
//
// These read from the exported seed `assessments` array rather than hardcoding
// RA-2304/"Daniela", so they track the seed if it is edited (dynamic-data intent).

function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
});

describe("workbench dashboard", () => {
  it("renders the three summary metrics", async () => {
    renderAt("/");
    await screen.findByText(/Good afternoon/i);
    expect(screen.getByText("Needs your review")).toBeInTheDocument();
    expect(screen.getByText("AI processing")).toBeInTheDocument();
    expect(screen.getByText("Committee ready")).toBeInTheDocument();
  });

  it("lists the seeded assessments in the table", async () => {
    renderAt("/");
    await screen.findByText(/Good afternoon/i);
    // Dashboard shows the first 6 rows; assert each seeded id/title is present.
    for (const a of assessments.slice(0, 6)) {
      expect(screen.getByText(a.id)).toBeInTheDocument();
      expect(screen.getByText(a.title)).toBeInTheDocument();
    }
  });
});

describe("assessments list — search & filter", () => {
  it("filters rows by a free-text search on the list view", async () => {
    const user = userEvent.setup();
    renderAt("/?view=list");
    const search = await screen.findByLabelText("Search assessments");

    const target = assessments[2]!; // any seeded row
    await user.type(search, target.id);

    await waitFor(() => {
      expect(screen.getByText(target.id)).toBeInTheDocument();
    });
    // A non-matching seeded row should disappear.
    const other = assessments.find((a) => a.id !== target.id)!;
    expect(screen.queryByText(other.id)).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches the search", async () => {
    const user = userEvent.setup();
    renderAt("/?view=list");
    const search = await screen.findByLabelText("Search assessments");

    await user.type(search, "zzz-no-such-assessment-zzz");

    await waitFor(() => {
      expect(screen.getByText(/No assessments match/i)).toBeInTheDocument();
    });
  });

  it("narrows the table when a stage filter is chosen", async () => {
    const user = userEvent.setup();
    renderAt("/?view=list");
    const filter = await screen.findByLabelText("Filter by stage");

    await user.selectOptions(filter, "Committee");

    await waitFor(() => {
      const committeeRows = assessments.filter((a) => a.stage === "Committee");
      for (const a of committeeRows) expect(screen.getByText(a.id)).toBeInTheDocument();
      const nonCommittee = assessments.find(
        (a) => a.stage !== "Committee" && a.stage !== "Decision",
      )!;
      expect(screen.queryByText(nonCommittee.id)).not.toBeInTheDocument();
    });
  });
});

describe("editable due date", () => {
  it("reveals a date input when the due-date cell is clicked and saves a new value", async () => {
    const user = userEvent.setup();
    renderAt("/?view=list");
    await screen.findByLabelText("Search assessments");

    // Pick a seeded row that is NOT in the Decision stage (those render a static
    // date, not an editable button — see AssessmentList in risk-guardian.tsx).
    const editable = assessments.find((a) => a.stage !== "Decision")!;
    // The DueEditor button is titled "Click to change due date"; there is one per
    // editable row, so scope by the row that contains the assessment id.
    const row = screen.getByText(editable.id).closest("tr")!;
    const dueButton = within(row).getByTitle(/click to change due date/i);

    await user.click(dueButton);
    const input = await screen.findByLabelText(`Due date for ${editable.id}`);
    expect(input).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "2027-01-15");
    // Blur to commit (DueEditor saves on blur).
    input.blur();

    await waitFor(() => {
      // Formatted back as dd Mon yyyy (en-GB) by fmtDate.
      expect(within(row).getByText(/15 Jan 2027/i)).toBeInTheDocument();
    });
  });
});

describe("new assessment form validation", () => {
  it("rejects an empty submission with required-field errors", async () => {
    const user = userEvent.setup();
    renderAt("/new-assessment");
    await screen.findByText(/Start a new risk assessment/i);

    // The submit button lives in the form; find it by its accessible name.
    const submit = screen.getByRole("button", { name: /submit request/i });
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByText(/Submission rejected/i)).toBeInTheDocument();
      // "Assessment title is required" appears in the error summary list AND the
      // inline field error, so assert at least one is shown.
      expect(screen.getAllByText(/Assessment title is required/i).length).toBeGreaterThan(0);
    });
  });
});
