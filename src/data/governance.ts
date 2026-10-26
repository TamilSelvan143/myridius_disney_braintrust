export type RiskLevel = "Critical" | "High" | "Medium" | "Low";
export type ControlEffectiveness = "Strong" | "Moderate" | "Weak";

export const riskFactorTaxonomy = [
  { id: "third_party", name: "Third-party risk", policyIds: ["TPRM-2023", "FFIEC-TPP"] },
  { id: "geographic", name: "Geographic risk", policyIds: ["FATF-R19", "FFIEC-GEO"] },
  { id: "product_channel", name: "Product / channel risk", policyIds: ["FATF-R15", "FFIEC-EB"] },
  {
    id: "transaction_pattern",
    name: "Transaction-pattern risk",
    policyIds: ["FINCEN-TRAVEL", "FINCEN-SAR"],
  },
  { id: "customer", name: "Customer risk", policyIds: ["FINCEN-CIP", "FINCEN-CDD"] },
] as const;

export const policyCorpus = [
  {
    id: "TPRM-2023",
    source: "FDIC / FRB / OCC",
    rule: "Interagency Guidance on Third-Party Relationships: Risk Management",
    version: "June 2023",
    status: "Active",
  },
  {
    id: "FFIEC-TPP",
    source: "FFIEC BSA/AML Manual",
    rule: "Third-Party Payment Processors",
    version: "Current approved corpus",
    status: "Active",
  },
  {
    id: "FATF-R19",
    source: "FATF",
    rule: "Recommendation 19 and jurisdictions under increased monitoring",
    version: "Current approved corpus",
    status: "Active",
  },
  {
    id: "FFIEC-GEO",
    source: "FFIEC BSA/AML Manual",
    rule: "BSA/AML Risk Assessment — geographic locations",
    version: "Current approved corpus",
    status: "Active",
  },
  {
    id: "FATF-R15",
    source: "FATF",
    rule: "Recommendation 15 — new technologies",
    version: "Current approved corpus",
    status: "Active",
  },
  {
    id: "FFIEC-EB",
    source: "FFIEC",
    rule: "Electronic Banking and Authentication guidance",
    version: "2021",
    status: "Active",
  },
  {
    id: "FINCEN-TRAVEL",
    source: "FinCEN",
    rule: "31 CFR 1010.410(e)–(f) — funds-transfer recordkeeping and Travel Rule",
    version: "Current approved corpus",
    status: "Active",
  },
  {
    id: "FINCEN-SAR",
    source: "FinCEN",
    rule: "31 CFR 1020.320 — suspicious activity reporting",
    version: "Current approved corpus",
    status: "Active",
  },
  {
    id: "FINCEN-CIP",
    source: "FinCEN",
    rule: "31 CFR 1020.220 — Customer Identification Program",
    version: "Current approved corpus",
    status: "Active",
  },
  {
    id: "FINCEN-CDD",
    source: "FinCEN",
    rule: "31 CFR 1010.230 — Customer Due Diligence Rule",
    version: "Current approved corpus",
    status: "Active",
  },
] as const;

export const effectivenessRate: Record<ControlEffectiveness, number> = {
  Strong: 0.6,
  Moderate: 0.4,
  Weak: 0.15,
};

export function residualScore(inherentScore: number, effectiveness: ControlEffectiveness) {
  return Math.max(1, Math.round(inherentScore * (1 - effectivenessRate[effectiveness])));
}

export function riskLevel(score: number): RiskLevel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

export const decisionLedgerSeed = [
  {
    assessmentId: "RA-2291",
    actorType: "human",
    actor: "M. Chen",
    action: "Source documents uploaded",
    timestamp: "02 Oct 09:12",
    evidence: "SHA-256: 4d8…a21",
  },
  {
    assessmentId: "RA-2291",
    actorType: "ai",
    actor: "Extraction model v2.8",
    action: "Facts and citations drafted",
    timestamp: "02 Oct 09:14",
    evidence: "6 source citations",
  },
  {
    assessmentId: "RA-2291",
    actorType: "code",
    actor: "Rules engine v1.4",
    action: "Factor scores and residuals calculated",
    timestamp: "02 Oct 10:40",
    evidence: "Taxonomy and policy corpus versions recorded",
  },
  {
    assessmentId: "RA-2291",
    actorType: "human",
    actor: "D. Ferreira",
    action: "Analyst review opened",
    timestamp: "02 Oct 12:34",
    evidence: "Authenticated session",
  },
] as const;
