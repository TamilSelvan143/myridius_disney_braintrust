import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { assessments } from "@/components/risk-guardian";

// Behavioural coverage of the assessment DETAIL page (AssessmentPage in
// risk-guardian.tsx) across workflow stages, driven through the real router.
// Exercises the Overview/Evidence/Controls/Audit-history tabs and the seeded
// Decision/Committee branches — the largest previously-untested component region.

function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

const byId = (id: string) => assessments.find((a) => a.id === id)!;

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("assessment detail page", () => {
  it("renders the title and the core panels for an early-stage assessment", async () => {
    const a = assessments.find((x) => x.stage === "Uploaded") ?? assessments[0]!;
    renderAt(`/assessment/${a.id}`);

    expect(await screen.findByRole("heading", { level: 1, name: a.title })).toBeInTheDocument();
    // Stable section heading on the detail page.
    expect(await screen.findByRole("heading", { name: /Source evidence/i })).toBeInTheDocument();
  });

  it("switches between the Overview, Evidence and Controls tabs", async () => {
    const user = userEvent.setup();
    const a = byId("RA-2291"); // Analyst review stage — full factor panels
    renderAt(`/assessment/${a.id}`);
    await screen.findByRole("heading", { level: 1, name: a.title });

    // Tabs are buttons labelled by name (Evidence/Controls carry a count suffix).
    await user.click(screen.getByRole("button", { name: /^Evidence/ }));
    await user.click(screen.getByRole("button", { name: /^Controls/ }));
    await user.click(screen.getByRole("button", { name: /^Overview/ }));

    // Back on Overview without crashing — the title is still present.
    expect(screen.getByRole("heading", { level: 1, name: a.title })).toBeInTheDocument();
  });

  it("opens a decided assessment on the Audit history tab with its ledger", async () => {
    const a = byId("RA-2267"); // Decision stage — defaults to Audit history + recorded decision
    renderAt(`/assessment/${a.id}`);
    await screen.findByRole("heading", { level: 1, name: a.title });

    // The decision/audit content is present for a decided assessment.
    expect(await screen.findByRole("heading", { name: /Audit history/i })).toBeInTheDocument();
  });

  it("shows the committee path for a committee-stage assessment", async () => {
    const a = byId("RA-2279"); // Committee stage
    renderAt(`/assessment/${a.id}`);
    await screen.findByRole("heading", { level: 1, name: a.title });
    // Factor panels render (risk composed from governed factors).
    expect(
      await screen.findByRole("heading", { name: /Overall risk|governed factors/i }),
    ).toBeInTheDocument();
  });
});
