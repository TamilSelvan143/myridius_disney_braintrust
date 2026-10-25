import { createFileRoute } from "@tanstack/react-router";
import { NewAssessmentPage } from "@/components/risk-guardian";
export const Route = createFileRoute("/new-assessment")({
 head:()=>({meta:[{title:"New Assessment | Risk Assessment Workbench"},{name:"description",content:"Create a risk assessment request and attach its source evidence."},{property:"og:title",content:"New Assessment | Risk Assessment Workbench"},{property:"og:description",content:"Submit a new evidence-led risk assessment request."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),
 component:NewAssessmentPage,
});
