import { createFileRoute } from "@tanstack/react-router";
import { AssessmentPage } from "@/components/risk-guardian";
export const Route = createFileRoute("/assessment/$assessmentId")({
 head:({params})=>({meta:[{title:`${params.assessmentId} | Risk Assessment Workbench`},{name:"description",content:"Review evidence, controls, decisions and audit history for this risk assessment."},{property:"og:title",content:`Assessment ${params.assessmentId} | Risk Assessment Workbench`},{property:"og:description",content:"Evidence-led assessment review and decision workspace."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),
 component:()=>{const {assessmentId}=Route.useParams();return <AssessmentPage id={assessmentId}/>},
});
