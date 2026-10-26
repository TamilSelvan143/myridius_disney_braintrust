import { createFileRoute } from "@tanstack/react-router";
import { RiskHome } from "@/components/risk-guardian";
import { homeSearchSchema } from "@/lib/home-search";

export const Route = createFileRoute("/")({
  validateSearch: (search) => homeSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Risk Assessment Workbench | Assessment Workspace" },
      {
        name: "description",
        content:
          "Evidence-led financial crime risk assessments with human review and complete audit history.",
      },
      { property: "og:title", content: "Risk Assessment Workbench" },
      {
        property: "og:description",
        content: "Evidence-led risk assessment and governance workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RiskHome,
});
