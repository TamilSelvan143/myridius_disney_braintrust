import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Covers the non-dashboard RiskHome views reached via ?view= (MyRequests,
// AuditLedger, Policies, Committee) — previously untested screens in
// risk-guardian.tsx.

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
  sessionStorage.clear();
});

describe("dashboard views", () => {
  it("renders the Assessments List view", async () => {
    renderAt("/?view=list");
    expect(await screen.findByLabelText("Search assessments")).toBeInTheDocument();
  });

  it("renders the Committee agenda view", async () => {
    renderAt("/?view=committee");
    expect((await screen.findAllByText(/Committee agenda/i)).length).toBeGreaterThan(0);
  });

  it("renders the Audit Ledger view", async () => {
    renderAt("/?view=audit");
    expect(
      (await screen.findAllByText(/Audit Ledger|What the Audit Ledger stores/i)).length,
    ).toBeGreaterThan(0);
  });

  it("renders the Policies view", async () => {
    renderAt("/?view=policies");
    expect((await screen.findAllByText(/Policies|Add a new policy/i)).length).toBeGreaterThan(0);
  });

  it("renders the My Requests (Product Owner) view", async () => {
    renderAt("/?view=requests");
    expect((await screen.findAllByText(/My requests/i)).length).toBeGreaterThan(0);
  });
});
