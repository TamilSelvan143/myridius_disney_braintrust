import { getRouteApi, Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { notify, markAllRead, clearAll, useNotifications } from "@/lib/notifications";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  Download,
  Clock3,
  FileCheck2,
  FilePlus2,
  FileText,
  HelpCircle,
  History,
  Inbox,
  Info,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { demoAssessmentDocuments, demoDocumentsAsAiPayload } from "@/data/demo-documents";
import { clearAiAnalysis, loadAiAnalysis, saveAiAnalysis } from "@/lib/ai-analysis-storage";
import { nextAssessmentId } from "@/lib/assessment-id";
import { readFileForAiAnalysis } from "@/lib/ai-document-read";
import {
  clearPendingAssessment,
  loadPendingAssessment,
  savePendingAssessment,
} from "@/lib/pending-assessment-storage";
import {
  loadAssessmentStage,
  removeAssessmentStage,
  saveAssessmentStage,
  subscribeAssessmentStages,
} from "@/lib/assessment-stage-storage";
import {
  getSubmittedAssessment,
  loadSubmittedAssessments,
  registerSubmittedAssessment,
  removeSubmittedAssessment,
  subscribeSubmittedAssessments,
  type SubmittedAssessmentRecord,
} from "@/lib/submitted-assessments-storage";
import {
  analyzeAssessmentWithAi,
  askAssessmentFollowUp,
  rerunFindingWithAi,
  type AiAnalysisResult,
  type AiFact,
} from "@/fns/assessment-ai";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  decisionLedgerSeed,
  effectivenessRate,
  policyCorpus,
  residualScore,
  riskFactorTaxonomy,
  riskLevel,
  type ControlEffectiveness,
  type RiskLevel,
} from "@/data/governance";

type Stage =
  "Uploaded" | "AI analysis" | "Analyst review" | "Needs information" | "Committee" | "Decision";
type Risk = RiskLevel;
type Eff = ControlEffectiveness;
type View = "dashboard" | "list" | "committee" | "audit" | "policies" | "requests";
type HomeViewLink = Exclude<View, "dashboard">;

const homeRoute = getRouteApi("/");
type Tab = "Overview" | "Evidence" | "Controls" | "Audit history";
type Assessment = {
  id: string;
  title: string;
  risk: Risk;
  stage: Stage;
  due: string;
  owner: string;
  summary: string;
  file: string;
  progress: number;
};

export const assessments: Assessment[] = [
  {
    id: "RA-2304",
    title: "Corporate card controls refresh",
    risk: "Low",
    stage: "Uploaded",
    due: "8 Oct",
    owner: "A. Mensah",
    summary: "New corporate card spending rules and merchant restrictions.",
    file: "card-controls-request.pdf",
    progress: 0,
  },
  {
    id: "RA-2301",
    title: "Real-time payments rollout",
    risk: "Medium",
    stage: "AI analysis",
    due: "Today, 15:00",
    owner: "R. Singh",
    summary: "Domestic instant payments for existing retail customers.",
    file: "rtp-product-brief.docx",
    progress: 1,
  },
  {
    id: "RA-2291",
    title: "International transfer feature",
    risk: "High",
    stage: "Analyst review",
    due: "Today, 16:00",
    owner: "D. Ferreira",
    summary: "Mobile cross-border transfers to Mexico and Nigeria with a $25,000 daily limit.",
    file: "international-transfer-brief.pdf",
    progress: 2,
  },
  {
    id: "RA-2288",
    title: "Digital onboarding for small business",
    risk: "Medium",
    stage: "Needs information",
    due: "Tomorrow",
    owner: "M. Chen",
    summary: "Remote onboarding flow for privately held small businesses.",
    file: "smb-onboarding-v2.pdf",
    progress: 2,
  },
  {
    id: "RA-2279",
    title: "Vera ID vendor onboarding",
    risk: "Critical",
    stage: "Committee",
    due: "5 Oct",
    owner: "J. Howard",
    summary: "Third-party identity and document verification provider onboarding.",
    file: "vera-id-due-diligence.pdf",
    progress: 3,
  },
  {
    id: "RA-2267",
    title: "Dormant account reactivation",
    risk: "Low",
    stage: "Decision",
    due: "Complete",
    owner: "S. Patel",
    summary: "Revised checks for digitally reactivating dormant accounts.",
    file: "reactivation-standard.pdf",
    progress: 4,
  },
];

const dueStore = { v: {} as Record<string, string>, l: new Set<() => void>() };
function setDue(id: string, v: string) {
  dueStore.v = { ...dueStore.v, [id]: v };
  dueStore.l.forEach((f) => f());
}
function useDue() {
  return useSyncExternalStore(
    (f) => {
      dueStore.l.add(f);
      return () => {
        dueStore.l.delete(f);
      };
    },
    () => dueStore.v,
    () => dueStore.v,
  );
}
function fmtDate(v: string) {
  const d = new Date(v + "T00:00:00");
  return isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function DueEditor({ id, fallback }: { id: string; fallback: string }) {
  const due = useDue();
  const [edit, setEdit] = useState(false);
  const v = due[id];
  if (edit)
    return (
      <input
        type="date"
        autoFocus
        aria-label={`Due date for ${id}`}
        defaultValue={v}
        onBlur={(e) => {
          if (e.target.value) setDue(id, e.target.value);
          setEdit(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEdit(false);
        }}
        className="rounded-md border border-input bg-surface px-2 py-1 font-mono text-[11px]"
      />
    );
  return (
    <button
      onClick={() => setEdit(true)}
      title="Click to change due date"
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-mono text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <Clock3 className="size-3" />
      {v ? fmtDate(v) : fallback}
    </button>
  );
}

const stages: Array<{ name: Exclude<Stage, "Needs information">; note: string }> = [
  { name: "Uploaded", note: "Request and source files received." },
  { name: "AI analysis", note: "Facts, citations and draft risks extracted." },
  { name: "Analyst review", note: "A person verifies evidence and ratings." },
  { name: "Committee", note: "Decision-makers review findings and controls." },
  { name: "Decision", note: "Outcome and rationale are locked in the ledger." },
];

export type FindingItem = {
  name: string;
  score: number;
  level: Risk;
  eff: Eff;
  owner: string;
  reason: string;
  evidence: string;
  framework: string;
  controls: string[];
  control: string;
};

const defaultFindings: FindingItem[] = [
  {
    name: "Third-party risk",
    score: 82,
    level: "Critical" as Risk,
    eff: "Moderate" as Eff,
    owner: "Vendor Risk",
    reason:
      "The identity-verification provider has no established monitoring history with the bank.",
    evidence:
      "Applicant doc §4.1, page 7 — “Vera ID will perform remote identity and document verification.”",
    framework:
      "Interagency Guidance on Third-Party Relationships: Risk Management (FDIC/FRB/OCC, June 2023); FFIEC BSA/AML Manual — Third-Party Payment Processors.",
    controls: ["Enhanced vendor due diligence", "Monthly service-quality monitoring"],
    control: "Complete vendor due diligence and introduce monthly service-quality monitoring.",
  },
  {
    name: "Geographic risk (MX · NG)",
    score: 78,
    level: "High" as Risk,
    eff: "Moderate" as Eff,
    owner: "FCRM Ops",
    reason:
      "The change introduces two cross-border corridors (Mexico, Nigeria) without prior transaction behaviour.",
    evidence:
      "Applicant doc §3.2, page 4 — Mexico and Nigeria are listed as initial destination markets.",
    framework:
      "FATF Recommendation 19 (higher-risk countries) & FATF jurisdictions under increased monitoring; FFIEC BSA/AML Manual — BSA/AML Risk Assessment (geographic locations).",
    controls: ["Corridor-specific thresholds", "Enhanced monitoring for first 90 days"],
    control: "Apply corridor-specific thresholds and enhanced monitoring for the first 90 days.",
  },
  {
    name: "Product / channel risk",
    score: 70,
    level: "High" as Risk,
    eff: "Moderate" as Eff,
    owner: "Digital Channels",
    reason:
      "Transfers are initiated only in the mobile app — a non-face-to-face channel exposed to account takeover.",
    evidence:
      "Applicant doc §1.3, page 2 — “Transfers are initiated exclusively in the mobile app.”",
    framework:
      "FATF Recommendation 15 (new technologies); FFIEC Authentication and Access to Financial Institution Services (2021); FFIEC BSA/AML Manual — Electronic Banking.",
    controls: ["Device binding", "Step-up authentication for new beneficiaries"],
    control: "Use device binding and step-up authentication for new beneficiaries.",
  },
  {
    name: "Transaction-pattern risk ($25k limit)",
    score: 64,
    level: "High" as Risk,
    eff: "Moderate" as Eff,
    owner: "Payments",
    reason:
      "International transfers and a 5× higher daily limit increase velocity and layering exposure.",
    evidence: "Applicant doc §2.4, page 3 — Daily outbound limit increases from $5,000 to $25,000.",
    framework:
      "31 CFR 1010.410(e)–(f) FinCEN funds-transfer recordkeeping & Travel Rule ($3,000 threshold); 31 CFR 1020.320 SAR filing; FFIEC BSA/AML Manual — Funds Transfers.",
    controls: ["Progressive limits", "Velocity rules", "Beneficiary cooling-off period"],
    control: "Use progressive limits, velocity rules and beneficiary cooling-off periods.",
  },
  {
    name: "Customer risk",
    score: 31,
    level: "Low" as Risk,
    eff: "Strong" as Eff,
    owner: "KYC Operations",
    reason: "The release is limited to existing retail customers with completed KYC.",
    evidence:
      "Applicant doc §2.1, page 2 — Access is restricted to customers active for at least 90 days.",
    framework:
      "31 CFR 1020.220 Customer Identification Program; 31 CFR 1010.230 FinCEN CDD Rule; FFIEC BSA/AML Manual — Customer Due Diligence.",
    controls: ["KYC refresh", "Sanctions screening"],
    control: "Retain existing KYC refresh and sanctions-screening controls.",
  },
];

const FindingsContext = createContext<FindingItem[]>(defaultFindings);
function useFindings() {
  return useContext(FindingsContext);
}

const LV: Risk[] = ["Critical", "High", "Medium", "Low"];
const SCORE: Record<Risk, number> = { Critical: 85, High: 65, Medium: 45, Low: 25 };
function residualOf(inh: Risk, eff: Eff): Risk {
  return riskLevel(residualScore(SCORE[inh], eff));
}
type EffOv = { eff: Eff; reason: string };
type Outcome = "Approved" | "Approved with conditions" | "Deferred" | "Rejected";
const OUTCOMES: { o: Outcome; note: string }[] = [
  { o: "Approved", note: "Proceed as submitted." },
  {
    o: "Approved with conditions",
    note: "Proceed only while named, monitored conditions are met.",
  },
  { o: "Deferred", note: "Pause until more evidence is supplied." },
  { o: "Rejected", note: "Residual risk exceeds tolerance." },
];
const MEMBERS = ["J. Howard (Chair)", "L. Okafor", "P. Novak"];
type Cond = { text: string; owner: string; due: string; status: string };
type Decision = { outcome: Outcome; rationale: string; tally: string; conditions: Cond[] };
const changeTypes: Record<string, string[]> = {
  "New product": ["Product / channel", "Customer", "Transaction-pattern"],
  "New geography": ["Geographic", "Transaction-pattern", "Customer"],
  "New vendor": ["Third-party", "Product / channel"],
  "New customer segment": ["Customer", "Geographic", "Product / channel"],
  "Limit change": ["Transaction-pattern", "Customer"],
};
const changeTypeOf: Record<string, string> = {
  "RA-2304": "New product",
  "RA-2301": "New product",
  "RA-2291": "New geography",
  "RA-2288": "New customer segment",
  "RA-2279": "New vendor",
  "RA-2267": "Limit change",
};

function changeTypeFor(id: string): string {
  return changeTypeOf[id] ?? getSubmittedAssessment(id)?.changeType ?? "Change";
}

function submittedToAssessment(r: SubmittedAssessmentRecord): Assessment {
  return {
    id: r.id,
    title: r.title,
    risk: "Medium",
    stage: "Uploaded",
    due: "New",
    owner: r.owner,
    summary: r.changeSummary,
    file: r.file,
    progress: 0,
  };
}

function stageProgress(stage: Stage): number {
  if (stage === "Needs information") return 2;
  const idx = stages.findIndex((s) => s.name === stage);
  return idx >= 0 ? idx : 0;
}

function resolveInitialStage(assessmentId: string, fallback: Stage): Stage {
  return (
    loadAssessmentStage(assessmentId) ??
    (loadAiAnalysis(assessmentId) ? "Analyst review" : fallback)
  );
}

function applyWorkflowStage(a: Assessment): Assessment {
  const stage = resolveInitialStage(a.id, a.stage);
  return { ...a, stage, progress: stageProgress(stage) };
}

let mergedAssessmentsCacheKey = "";
let mergedAssessmentsCache: Assessment[] = assessments;

function aiStorageFingerprint(): string {
  if (typeof sessionStorage === "undefined") return "";
  const parts: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith("risk-workbench-ai:")) {
      parts.push(`${k}:${sessionStorage.getItem(k) ?? ""}`);
    }
  }
  return parts.sort().join("|");
}

function mergeAssessments(): Assessment[] {
  const submitted = loadSubmittedAssessments();
  const cacheKey = `${JSON.stringify(submitted)}|${typeof sessionStorage !== "undefined" ? (sessionStorage.getItem("risk-workbench-stage") ?? "") : ""}|${aiStorageFingerprint()}`;
  if (cacheKey === mergedAssessmentsCacheKey) {
    return mergedAssessmentsCache;
  }
  mergedAssessmentsCacheKey = cacheKey;
  const map = new Map(assessments.map((a) => [a.id, a]));
  for (const r of submitted) {
    map.set(r.id, submittedToAssessment(r));
  }
  const submittedIds = new Set(submitted.map((r) => r.id));
  mergedAssessmentsCache = [...map.values()].map(applyWorkflowStage).sort((a, b) => {
    const rank = (id: string) => (submittedIds.has(id) ? 0 : 1);
    const d = rank(a.id) - rank(b.id);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
  return mergedAssessmentsCache;
}

function subscribeAllAssessments(onStoreChange: () => void) {
  const unsubSubmitted = subscribeSubmittedAssessments(onStoreChange);
  const unsubStages = subscribeAssessmentStages(onStoreChange);
  return () => {
    unsubSubmitted();
    unsubStages();
  };
}

function useAllAssessments(): Assessment[] {
  return useSyncExternalStore(subscribeAllAssessments, mergeAssessments, mergeAssessments);
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "ai";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
        tone === "good" && "bg-success/10 text-success ring-success/25",
        tone === "warn" && "bg-warning/10 text-warning ring-warning/25",
        tone === "bad" && "bg-destructive/10 text-destructive ring-destructive/25",
        tone === "ai" && "bg-ai/10 text-ai ring-ai/25",
        tone === "neutral" && "bg-muted text-muted-foreground ring-border",
      )}
    >
      {children}
    </span>
  );
}
function riskTone(r: Risk) {
  return r === "Critical" ? "bad" : r === "High" ? "warn" : r === "Low" ? "good" : "neutral";
}
function Panel({
  title,
  help,
  action,
  children,
  className,
}: {
  title: string;
  help?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("frost overflow-hidden rounded-lg border border-border/70", className)}>
      <header className="flex min-h-11 items-center gap-2 border-b border-border/60 px-4">
        <h2 className="text-xs font-semibold">{title}</h2>
        {help ? (
          <span title={help} className="text-muted-foreground">
            <HelpCircle className="size-3.5" />
          </span>
        ) : null}
        <span className="ml-auto">{action}</span>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function AppShell({
  children,
  active = "dashboard",
}: {
  children: React.ReactNode;
  active?: View | "new";
}) {
  const nav = [
    { k: "dashboard", label: "Assessment workspace", icon: LayoutDashboard, to: "/" as const },
    { k: "new", label: "New Assessment", icon: FilePlus2, to: "/new-assessment" as const },
  ];
  const committeeCount = assessments.filter((a) => a.stage === "Committee").length;
  return (
    <div className="app-backdrop min-h-screen text-foreground">
      <aside className="frost fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/70 p-4 lg:flex">
        <Link to="/" className="flex items-center gap-3 px-1 pb-6">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <span>
            <b className="block text-sm">Risk Assessment Workbench</b>
            <small className="text-[10px] text-muted-foreground">Evidence-led governance</small>
          </span>
        </Link>
        <nav className="space-y-1">
          {nav.map((n) => (
            <Button
              key={n.k}
              variant="ghost"
              size="sm"
              asChild
              className={cn("w-full justify-start", active === n.k && "bg-accent")}
            >
              <Link to={n.to}>
                <n.icon className="size-4" />
                {n.label}
              </Link>
            </Button>
          ))}
          <NavButton
            active={active === "requests"}
            icon={ClipboardList}
            label="My requests (PO)"
            view="requests"
          />
          <NavButton active={active === "list"} icon={Inbox} label="Assessments List" view="list" />
          <NavButton
            active={active === "committee"}
            icon={UsersRound}
            label="Committee"
            view="committee"
          />
          <NavButton active={active === "audit"} icon={History} label="Audit Ledger" view="audit" />
          <NavButton
            active={active === "policies"}
            icon={BookOpen}
            label="Policies"
            view="policies"
          />
        </nav>
        <div className="mt-auto rounded-md bg-surface p-3 ring-1 ring-border">
          <div className="text-[10px] uppercase text-muted-foreground">Review workload</div>
          <b className="mt-1 block font-mono text-sm">{assessments.length} assessments</b>
          <small className="text-[10px] text-muted-foreground">
            {committeeCount} awaiting committee
          </small>
        </div>
      </aside>
      <main className="min-h-screen lg:ml-60">{children}</main>
    </div>
  );
}
function NavButton({
  active,
  icon: Icon,
  label,
  view,
}: {
  active: boolean;
  icon: typeof Inbox;
  label: string;
  view: HomeViewLink;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={cn("w-full justify-start", active && "bg-accent")}
    >
      <Link to="/" search={{ view }}>
        <Icon className="size-4" />
        {label}
      </Link>
    </Button>
  );
}
function Topbar({ title, crumb }: { title: string; crumb?: string }) {
  return (
    <header className="frost sticky top-0 z-20 flex min-h-15 items-center justify-between border-b border-border/70 px-4 lg:px-7">
      <div className="min-w-0">
        <small className="block text-[10px] text-muted-foreground">
          {crumb ?? "Risk Assessment Workbench"}
        </small>
        <b className="block truncate text-sm">{title}</b>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Button asChild size="sm">
          <Link to="/new-assessment">
            <Plus />
            New Assessment
          </Link>
        </Button>
      </div>
    </header>
  );
}
function NotificationBell() {
  const list = useNotifications();
  const [open, setOpen] = useState(false);
  const unread = list.filter((n) => !n.read).length;
  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread) setTimeout(markAllRead, 1500);
        }}
        className="relative grid size-8 place-items-center rounded-md border border-border hover:bg-muted"
      >
        <Bell className="size-4" />
        {unread ? (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-30 w-80 rounded-md border border-border bg-popover p-2 text-xs text-popover-foreground shadow-lg">
          <div className="mb-1 flex items-center justify-between px-1">
            <b>Notifications</b>
            {list.length ? (
              <button className="text-muted-foreground hover:text-foreground" onClick={clearAll}>
                Clear
              </button>
            ) : null}
          </div>
          {list.length ? (
            <ul className="max-h-80 overflow-auto">
              {list.map((n) => (
                <li key={n.id} className={cn("rounded px-2 py-2", !n.read && "bg-primary/5")}>
                  <p>{n.text}</p>
                  <small className="text-muted-foreground">{new Date(n.at).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 py-3 text-muted-foreground">
              No notifications yet. You will be notified when an assessment changes stage.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function RiskHome() {
  const all = useAllAssessments();
  const { view: viewParam } = homeRoute.useSearch();
  const view: View = viewParam ?? "dashboard";
  useEffect(() => {
    const retiredDemoId = "RA-2310";
    removeSubmittedAssessment(retiredDemoId);
    removeAssessmentStage(retiredDemoId);
    clearAiAnalysis(retiredDemoId);
    const pending = loadPendingAssessment();
    if (pending?.assessmentId === retiredDemoId) {
      clearPendingAssessment();
      return;
    }
    if (!pending) return;
    if (getSubmittedAssessment(pending.assessmentId)) return;
    registerSubmittedAssessment({
      id: pending.assessmentId,
      title: pending.title,
      owner: pending.owner,
      changeType: pending.changeType,
      changeSummary: pending.changeSummary,
      file: pending.documents[0]?.name ?? "uploaded-document",
    });
  }, []);
  const [filter, setFilter] = useState("All stages");
  const shown = useMemo(
    () => (filter === "All stages" ? all : all.filter((a) => a.stage === filter)),
    [filter, all],
  );
  if (view !== "dashboard")
    return (
      <AppShell active={view}>
        <Topbar
          title={
            view === "list"
              ? "Assessments List"
              : view === "committee"
                ? "Committee agenda"
                : view === "audit"
                  ? "Audit Ledger"
                  : view === "requests"
                    ? "My requests — Product Owner view"
                    : "Policies"
          }
        />
        <div className="p-4 lg:p-7">
          {view === "list" ? (
            <AssessmentList searchable rows={shown} filter={filter} setFilter={setFilter} />
          ) : view === "audit" ? (
            <AuditLedger />
          ) : view === "policies" ? (
            <Policies />
          ) : view === "requests" ? (
            <MyRequests rows={all} />
          ) : (
            <Committee />
          )}
        </div>
      </AppShell>
    );
  const reviewRows = all.filter(
    (a) => a.stage === "Analyst review" || a.stage === "Needs information",
  );
  const aiCount = all.filter((a) => a.stage === "AI analysis").length;
  const committeeCount = all.filter((a) => a.stage === "Committee").length;
  return (
    <AppShell active="dashboard">
      <Topbar title="Assessment workspace" />
      <div className="p-4 lg:p-7">
        <section className="mb-5">
          <h1 className="text-2xl font-semibold">Good afternoon, Daniela</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your evidence-led risk review workspace.
          </p>
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Needs your review" value={String(reviewRows.length)} note="due today" />
          <Metric
            label="AI processing"
            value={String(aiCount)}
            note="Facts and citations being drafted"
          />
          <Metric
            label="Committee ready"
            value={String(committeeCount)}
            note="Decision rationale required"
          />
        </div>
        <div className="mt-5">
          <AssessmentList rows={all.slice(0, 6)} filter={filter} setFilter={setFilter} />
        </div>
      </div>
    </AppShell>
  );
}
function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="frost rounded-lg border border-border/70 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">{note}</div>
    </div>
  );
}
function AssessmentList({
  rows: all,
  filter,
  setFilter,
  searchable,
}: {
  rows: Assessment[];
  filter: string;
  setFilter: (x: string) => void;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const rows = t
    ? all.filter((a) =>
        [a.id, a.title, a.owner, a.risk, a.stage, changeTypeFor(a.id)].some((x) =>
          x.toLowerCase().includes(t),
        ),
      )
    : all;
  return (
    <Panel
      title="Assessments List"
      help="Every request appears here from upload through final decision."
      action={
        <select
          aria-label="Filter by stage"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-input bg-surface px-2 py-1 text-[10px]"
        >
          <option>All stages</option>
          {stages.map((s) => (
            <option key={s.name}>{s.name}</option>
          ))}
          <option>Needs information</option>
        </select>
      }
    >
      {searchable ? (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by reference, title, change type, owner, risk or stage…"
            aria-label="Search assessments"
            className="input-field pl-9"
          />
        </div>
      ) : null}
      <div className="mb-4 grid gap-2 sm:grid-cols-5">
        {stages.map((s, i) => (
          <div key={s.name} className="rounded-md bg-surface p-2 ring-1 ring-border/60">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold">
              <span className="grid size-4 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground">
                {i + 1}
              </span>
              {s.name}
            </div>
            <p className="mt-1 text-[9px] leading-4 text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-border text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="pb-3">Reference</th>
              <th className="pb-3">Assessment</th>
              <th className="pb-3">Change type</th>
              <th className="pb-3">Risk</th>
              <th className="pb-3">Stage</th>
              <th className="pb-3">Owner</th>
              <th className="pb-3">Due</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-border/50 last:border-0">
                <td className="py-3 font-mono">{a.id}</td>
                <td className="py-3 font-medium">{a.title}</td>
                <td>
                  <Pill>{changeTypeFor(a.id)}</Pill>
                </td>
                <td>
                  <Pill tone={riskTone(a.risk)}>{a.risk}</Pill>
                </td>
                <td>
                  <Pill
                    tone={
                      a.stage === "AI analysis"
                        ? "ai"
                        : a.stage === "Decision"
                          ? "good"
                          : a.stage === "Committee"
                            ? "warn"
                            : "neutral"
                    }
                  >
                    {a.stage}
                  </Pill>
                </td>
                <td>{a.owner}</td>
                <td>
                  {a.stage === "Decision" ? (
                    <span className="font-mono text-muted-foreground">{a.due}</span>
                  ) : (
                    <DueEditor id={a.id} fallback={a.due} />
                  )}
                </td>
                <td className="text-right">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/assessment/$assessmentId" params={{ assessmentId: a.id }}>
                      Open
                      <ChevronRight />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  No assessments match “{q}”.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">
        Tip: click any due date to change it.
      </p>
    </Panel>
  );
}

export function AssessmentPage({ id }: { id: string }) {
  const all = useAllAssessments();
  const a0 = all.find((x) => x.id === id) ?? null;
  const [stage, setStageRaw] = useState<Stage>(() =>
    resolveInitialStage(id, a0?.stage ?? "Uploaded"),
  );
  const setStage = useCallback(
    (next: Stage) => {
      setStageRaw((prev) => {
        if (prev !== next && a0) notify(`${a0.id} · ${a0.title} moved from ${prev} to ${next}`);
        return next;
      });
      saveAssessmentStage(id, next);
    },
    [a0, id],
  );
  useEffect(() => {
    const saved = loadAiAnalysis(id);
    if (saved) setAiResult(saved);
    setStageRaw(resolveInitialStage(id, assessments.find((x) => x.id === id)?.stage ?? "Uploaded"));
  }, [id]);
  const a = a0 ? { ...a0, stage, progress: stageProgress(stage) } : a0;
  const seeded = !!a0 && a0.progress > 2;
  const [reviews, setReviews] = useState<Record<number, Review>>(
    seeded
      ? {
          0: { status: "Accepted" },
          1: { status: "Accepted" },
          2: { status: "Accepted" },
          3: {
            status: "Overridden",
            level: "Medium",
            score: 45,
            reason:
              "Progressive limits cap new users at $5,000 for the first 60 days (§2.4), so the $25k exposure is narrower than modelled.",
          },
          4: { status: "Accepted" },
        }
      : {},
  );
  const [effOv, setEffOv] = useState<Record<number, EffOv>>(
    seeded
      ? {
          0: {
            eff: "Weak",
            reason:
              "Vendor due diligence not yet complete — controls are designed but not operating.",
          },
        }
      : {},
  );
  const [tab, setTab] = useState<Tab>(a?.stage === "Decision" ? "Audit history" : "Overview");
  const [finding, setFinding] = useState(0);
  const [voteOpen, setVoteOpen] = useState(false);
  const [recorded, setRecorded] = useState<Decision | null>(
    a?.stage === "Decision"
      ? {
          outcome: "Approved with conditions",
          rationale: "Controls verified before release.",
          tally: "3–0",
          conditions: [
            {
              text: defaultFindings[0]!.control,
              owner: defaultFindings[0]!.owner,
              due: "2026-10-20",
              status: "Monitoring",
            },
            {
              text: defaultFindings[1]!.control,
              owner: defaultFindings[1]!.owner,
              due: "2026-12-31",
              status: "Open",
            },
          ],
        }
      : null,
  );
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(() => loadAiAnalysis(id));
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const activeFindings = aiResult?.findings?.length ? aiResult.findings : defaultFindings;
  const activeFacts: AiFact[] | null = aiResult?.facts?.length ? aiResult.facts : null;
  const activeSummary = aiResult?.requestSummary ?? null;
  const runAiAnalysis = useCallback(async () => {
    if (!a0) return;
    setAiError("");
    setAiBusy(true);
    setStage("AI analysis");
    try {
      const pending = loadPendingAssessment();
      const documents =
        pending?.assessmentId === a0.id ? pending.documents : demoDocumentsAsAiPayload();
      const result = await analyzeAssessmentWithAi({
        data: {
          assessmentId: a0.id,
          title: a0.title,
          changeType: changeTypeFor(a0.id),
          owner: a0.owner,
          changeSummary: pending?.changeSummary ?? a0.summary,
          documents,
        },
      });
      saveAiAnalysis(a0.id, result);
      saveAssessmentStage(a0.id, "Analyst review");
      setAiResult(result);
      notify(`${a0.id} · AI analysis complete (${result.model})`);
      setStageRaw("Analyst review");
      setTab("Overview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI analysis failed";
      setAiError(msg);
      notify(`${a0.id} · AI analysis failed`);
      setStage("Uploaded");
    } finally {
      setAiBusy(false);
    }
  }, [a0, setStage]);
  const late = a?.stage === "Committee" || a?.stage === "Decision";
  if (!a0)
    return (
      <AppShell active="list">
        <Topbar title="Assessment not found" crumb="Assessments List" />
        <div className="p-4 lg:p-7">
          <p className="text-sm text-muted-foreground">
            No assessment with reference <span className="font-mono">{id}</span>. Submit one from
            New Assessment or pick a row from the list.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/" search={{ view: "list" }}>
              Assessments List
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  if (!a) return null;
  return (
    <FindingsContext.Provider value={activeFindings}>
      <AppShell active="list">
        <Topbar title={`${a.id} · ${a.title}`} crumb="Assessments List" />
        <div className="p-4 lg:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" search={{ view: "list" }}>
                <ArrowLeft />
                Assessments List
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Pill>{changeTypeFor(a.id)}</Pill>
              <Pill tone={riskTone(a.risk)}>{a.risk} risk</Pill>
              <Pill
                tone={a.stage === "AI analysis" ? "ai" : a.stage === "Decision" ? "good" : "warn"}
              >
                {a.stage}
              </Pill>
            </div>
          </div>
          <StageTrack current={a.progress} />
          <div className="mt-5">
            <h1 className="text-2xl font-semibold">{a.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{a.summary}</p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Due date:</span>
            {a.stage === "Decision" ? (
              <span className="font-mono">{a.due}</span>
            ) : (
              <DueEditor id={a.id} fallback={a.due} />
            )}
          </div>
          <StageNotice stage={a.stage} />
          {a.stage === "Needs information" ? (
            <NeedsInfo resolve={() => setStage("Analyst review")} />
          ) : null}
          {a.stage === "Uploaded" && !aiResult ? (
            <div className="mt-3 rounded-md border border-ai/30 bg-ai/5 p-4 text-xs">
              <b className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-ai" />
                Ready for analysis
              </b>
              <p className="mt-1 text-muted-foreground">
                The request and its source documents are received. Start live AI analysis to extract
                facts, citations and draft risk findings.
              </p>
              {aiError ? (
                <p role="alert" className="mt-2 text-[10px] text-destructive">
                  {aiError}
                </p>
              ) : null}
              <Button
                size="sm"
                className="mt-3"
                disabled={aiBusy}
                onClick={() => void runAiAnalysis()}
              >
                <ShieldCheck />
                {aiBusy ? "AI analyzing…" : "Start AI analysis"}
              </Button>
            </div>
          ) : null}
          {a.stage === "AI analysis" && !aiBusy && !aiResult && aiError ? (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {aiError}
            </div>
          ) : null}
          {a.stage === "AI analysis" && aiBusy ? (
            <div className="mt-3 rounded-md border border-ai/30 bg-ai/5 p-3 text-xs text-muted-foreground">
              Calling extraction + drafting agents…
            </div>
          ) : null}
          {a.stage === "Analyst review" && aiResult ? (
            <div className="mt-3 rounded-md border border-success/30 bg-success/10 p-4 text-xs">
              <Check className="size-4 text-success" />
              <b className="mt-2 block">AI analysis complete — analyst review unlocked</b>
              <p className="mt-1 text-muted-foreground">
                Review each finding below (Accept or Override), then use <b>Send to Committee</b>.
                Live model: {aiResult.model}
              </p>
            </div>
          ) : null}
          <div className="mt-5 flex gap-5 border-b border-border">
            {(["Overview", "Evidence", "Controls", "Audit history"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "border-b-2 pb-2 text-xs font-medium",
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground",
                )}
              >
                {t}
                {t === "Evidence" ? " · 10" : t === "Controls" ? " · 3" : ""}
              </button>
            ))}
          </div>
          {tab === "Overview" ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-12">
              <div className="space-y-4 xl:col-span-3">
                <SourcePanel assessment={a} />
                <FactsPanel id={a.id} facts={activeFacts} aiModel={aiResult?.model} />
              </div>
              <div className="space-y-4 xl:col-span-6">
                {late ? <DeltaPanel reviews={reviews} effOv={effOv} /> : null}
                <RiskPanel
                  active={finding}
                  setActive={(i) => {
                    setFinding(i);
                    document
                      .getElementById(`finding-${i}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  reviews={reviews}
                />
                {activeFindings.map((_, i) => (
                  <FindingPanel
                    key={i}
                    index={i}
                    stage={a.stage}
                    review={reviews[i]}
                    setReview={(rv) => setReviews((x) => ({ ...x, [i]: rv }))}
                    effOv={effOv[i]}
                    setEffOv={(v) => setEffOv((x) => ({ ...x, [i]: v }))}
                    onFocus={() => setFinding(i)}
                  />
                ))}
                <FollowUpPanel
                  stage={a.stage}
                  active={finding}
                  assessmentId={a.id}
                  aiResult={aiResult}
                  onRevise={(i, rv) => setReviews((x) => ({ ...x, [i]: rv }))}
                />
                <AnalystPanel
                  stage={a.stage}
                  reviews={reviews}
                  send={() => setStage("Committee")}
                  askInfo={() => setStage("Needs information")}
                />
              </div>
              <div className="space-y-4 xl:col-span-3">
                <DecisionPanel
                  stage={a.stage}
                  enabled={a.stage === "Committee"}
                  recorded={recorded}
                  open={() => setVoteOpen(true)}
                />
                {recorded?.conditions.length ? (
                  <ConditionsPanel
                    decision={recorded}
                    update={(c) => setRecorded({ ...recorded, conditions: c })}
                  />
                ) : null}
                <AuditMini open={() => setTab("Audit history")} />
              </div>
            </div>
          ) : tab === "Evidence" ? (
            <Evidence requestSummary={activeSummary} aiModel={aiResult?.model} />
          ) : tab === "Controls" ? (
            <Controls id={a.id} />
          ) : (
            <AuditHistory assessment={a} aiResult={aiResult} />
          )}
        </div>
        {voteOpen ? (
          <CommitteeVoteDialog
            close={() => setVoteOpen(false)}
            save={(d) => {
              setRecorded(d);
              setVoteOpen(false);
              if (d.outcome !== "Deferred") setStage("Decision");
            }}
          />
        ) : null}
      </AppShell>
    </FindingsContext.Provider>
  );
}
function StageTrack({ current }: { current: number }) {
  return (
    <div className="frost rounded-lg border border-border/70 p-4">
      <div className="flex items-center overflow-x-auto">
        {stages.map((s, i) => (
          <div key={s.name} className="contents">
            <div className="group shrink-0">
              <div className="flex items-center gap-2 text-[11px]">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    i < current ? "bg-success" : i === current ? "bg-warning" : "bg-border",
                  )}
                />
                <b className={cn(i > current && "text-muted-foreground")}>{s.name}</b>
              </div>
              <div className="mt-1 max-w-32 text-[9px] text-muted-foreground">{s.note}</div>
            </div>
            {i < 4 ? <div className="mx-3 h-px min-w-6 flex-1 bg-border" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
function StageNotice({ stage }: { stage: Stage }) {
  const copy: { [K in Stage]: string } = {
    Uploaded: "The request is safely received. AI analysis has not started yet.",
    "AI analysis":
      "AI is extracting draft facts and linking every claim to a source location. Human verification follows.",
    "Analyst review":
      "This is where a human analyst approves or rejects each AI decision. Open each risk finding below, then click “Accept finding” (AI is right) or “Override with reason” (AI is wrong — change the rating and explain why). When all findings are reviewed, send it to Committee.",
    "Needs information":
      "The analyst found that something is missing from the request (for example a vendor contract or a volume estimate), so the review is paused and the ticket has gone back to the requester. Once they supply it, the review continues.",
    Committee:
      "Evidence is verified and ready for a committee decision. Every outcome requires a short rationale.",
    Decision:
      "The final outcome and supporting rationale are stored in the immutable audit record.",
  };
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/25 bg-primary/5 p-3 text-xs">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <b>{stage}</b>
        <p className="mt-0.5 text-muted-foreground">{copy[stage]}</p>
      </div>
    </div>
  );
}
function SourcePanel({ assessment: a }: { assessment: Assessment }) {
  return (
    <Panel
      title="Source evidence"
      help="The exact uploaded document passage used to support a fact or risk finding."
    >
      <div className="rounded-md bg-surface p-3 ring-1 ring-border">
        <FileText className="size-4 text-primary" />
        <b className="mt-2 block truncate text-xs">{a.file}</b>
        <small className="text-[10px] text-muted-foreground">
          Uploaded by request owner · SHA-256 recorded
        </small>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        <b className="text-foreground">How it is drafted:</b> the AI reads the uploaded file,
        proposes a finding, and attaches its page and section. Reviewers verify the citation before
        it can support a decision.
      </p>
      <Button className="mt-3 w-full" size="sm" variant="outline">
        <FileCheck2 />
        Open document
      </Button>
    </Panel>
  );
}
function FactsPanel({
  id,
  facts,
  aiModel,
}: {
  id: string;
  facts?: AiFact[] | null;
  aiModel?: string | undefined;
}) {
  const ct = changeTypeFor(id);
  const fallback = [
    { label: "Change type", value: ct, confidence: "1.00", source: "Set by Product Owner" },
    {
      label: "Product",
      value: "Mobile transfer / remittance",
      confidence: "0.97",
      source: "Brief §1.3, page 2",
    },
    {
      label: "Customer segment",
      value: "Existing retail",
      confidence: "0.90",
      source: "Brief §2.1, page 2",
    },
    {
      label: "Activity geography",
      value: "US → MX · NG",
      confidence: "0.98",
      source: "Brief §3.2, page 4",
    },
    {
      label: "Third party",
      value: "Vera ID (new)",
      confidence: "0.94",
      source: "Due diligence §4.1, page 7",
    },
    { label: "Daily limit", value: "$25,000", confidence: "0.99", source: "Brief §2.4, page 3" },
  ];
  const shown = facts?.length ? facts : fallback;
  return (
    <Panel
      title="Structured facts"
      action={
        <Pill tone="ai">
          {facts?.length ? `Live AI · ${aiModel ?? "Anthropic"}` : "AI extracted · verify"}
        </Pill>
      }
      help="Draft fields found by AI, with extraction confidence and source sentence location."
    >
      <div className="space-y-2">
        {shown.map((f) => (
          <div key={f.label} className="rounded-md bg-surface p-2 ring-1 ring-border/60">
            <div className="flex justify-between gap-2 text-[11px]">
              <span className="text-muted-foreground">{f.label}</span>
              <b className="text-right">{f.value}</b>
            </div>
            <div className="mt-1 flex justify-between gap-2 text-[9px] text-muted-foreground">
              <span>AI confidence {f.confidence}</span>
              <span className="text-right">{f.source}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
        Taxonomy match: <b className="text-foreground">{(changeTypes[ct] ?? []).join(", ")}</b>. All{" "}
        {riskFactorTaxonomy.length} governed factors are still scored.
      </p>
    </Panel>
  );
}
function RiskPanel({
  active,
  setActive,
  reviews,
}: {
  active: number;
  setActive: (n: number) => void;
  reviews: Record<number, Review>;
}) {
  const findings = useFindings();
  const scores = findings.map((f, i) => reviews[i]?.score ?? f.score);
  const overall = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const level = riskLevel(overall);
  return (
    <Panel
      title="Overall risk — composed from governed factors"
      help="The overall result is derived from the named factor records below, never entered as a bare label."
      action={
        <div className="flex items-center gap-2">
          <Pill tone={riskTone(level)}>
            Overall {level} · {overall}
          </Pill>
          <span className="font-mono text-[10px] text-muted-foreground">
            mean of {findings.length} factors
          </span>
        </div>
      }
    >
      <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
        <b className="text-foreground">Why {level}:</b> the rules engine combines the independently
        evidenced factors below. Each factor includes the source activity, an approved supervisory
        rule, controls, and residual risk.
      </p>
      <div className="space-y-1">
        {findings.map((f, i) => (
          <button
            key={f.name}
            onClick={() => setActive(i)}
            className={cn(
              "grid w-full grid-cols-[minmax(8rem,11rem)_1fr_2rem_5.5rem] items-center gap-3 rounded-md p-2 text-left",
              active === i ? "bg-accent ring-1 ring-border" : "hover:bg-accent/50",
            )}
          >
            <span className="text-[11px] font-medium">{f.name}</span>
            <span className="h-1.5 rounded-full bg-border">
              <span
                className={cn(
                  "block h-full rounded-full",
                  f.level === "Low"
                    ? "bg-success"
                    : f.level === "Critical"
                      ? "bg-destructive"
                      : "bg-warning",
                )}
                style={{ width: `${f.score}%` }}
              />
            </span>
            <span className="font-mono text-[11px]">{reviews[i]?.score ?? f.score}</span>
            <span className="text-right">
              {reviews[i] ? (
                <Pill tone={reviews[i].status === "Accepted" ? "good" : "warn"}>
                  {reviews[i].status}
                </Pill>
              ) : (
                <Pill>To review</Pill>
              )}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}
type Review = { status: "Accepted" | "Overridden"; level?: Risk; score?: number; reason?: string };
function FindingPanel({
  index,
  stage,
  review,
  setReview,
  effOv,
  setEffOv,
  onFocus,
}: {
  index: number;
  stage: Stage;
  review: Review | undefined;
  setReview: (r: Review) => void;
  effOv: EffOv | undefined;
  setEffOv: (v: EffOv) => void;
  onFocus: () => void;
}) {
  const findings = useFindings();
  const f = findings[index];
  const [ov, setOv] = useState(false);
  const [lvl, setLvl] = useState<Risk | "">("");
  const [why, setWhy] = useState("");
  const [tried, setTried] = useState(false);
  const [effEdit, setEffEdit] = useState(false);
  const [effV, setEffV] = useState<Eff>("Moderate");
  const [effWhy, setEffWhy] = useState("");
  const [effTried, setEffTried] = useState(false);
  if (!f) return null;
  const canReview = stage === "Analyst review";
  const inherent = review?.level ?? f.level;
  const eff = effOv?.eff ?? f.eff;
  const residual = residualOf(inherent, eff);
  const aiResidual = residualOf(f.level, f.eff);
  const inherentScore = review?.score ?? f.score;
  const residualNumeric = residualScore(inherentScore, eff);
  const reduction = Math.round(effectivenessRate[eff] * 100);
  const lvlErr = !lvl
    ? "Choose a rating from the allowed scale (Critical, High, Medium, Low)."
    : lvl === f.level
      ? `Pick a rating different from the AI's (${f.level}) — otherwise accept the finding.`
      : "";
  const whyErr = why.trim().length < 8 ? "A reason is mandatory (at least 8 characters)." : "";
  const effErr =
    effV === f.eff
      ? `Pick an effectiveness different from the AI's (${f.eff}).`
      : effWhy.trim().length < 8
        ? "A reason is mandatory (at least 8 characters)."
        : "";
  return (
    <div id={`finding-${index}`} onClick={onFocus} className="scroll-mt-20">
      <Panel
        title={`Factor ${index + 1} · ${f.name}`}
        action={
          <div className="flex items-center gap-1.5">
            {review ? (
              <Pill tone={review.status === "Accepted" ? "good" : "warn"}>{review.status}</Pill>
            ) : (
              <Pill>To review</Pill>
            )}
            <Pill tone={riskTone(residual)}>Residual {residual}</Pill>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-surface p-3 ring-1 ring-border">
            <b className="text-[10px] uppercase text-primary">AI reasoning</b>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{f.reason}</p>
          </div>
          <div className="rounded-md bg-surface p-3 ring-1 ring-border">
            <b className="text-[10px] uppercase text-primary">Citation 1 · Applicant document</b>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{f.evidence}</p>
          </div>
          <div className="rounded-md bg-surface p-3 ring-1 ring-primary/30">
            <b className="flex items-center gap-1 text-[10px] uppercase text-primary">
              <BookOpen className="size-3" />
              Citation 2 · Regulatory framework
            </b>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{f.framework}</p>
          </div>
        </div>
        <div className="mt-3 grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1.6fr_auto_1fr]">
          <div className="rounded-md bg-surface p-3 ring-1 ring-border">
            <small className="text-[10px] uppercase text-muted-foreground">
              Inherent risk · before safeguards
            </small>
            <div className="mt-1">
              <Pill tone={riskTone(inherent)}>
                {inherent} · {inherentScore}/100
              </Pill>
            </div>
            <small className="mt-2 block text-[10px] text-muted-foreground">
              Origin: {review?.level ? "Human override" : "AI draft, scored by code"}
            </small>
          </div>
          <ChevronRight className="hidden size-4 self-center text-muted-foreground sm:block" />
          <div className="rounded-md bg-surface p-3 ring-1 ring-border">
            <small className="text-[10px] uppercase text-muted-foreground">Controls applied</small>
            <ul className="mt-1 list-disc pl-4 text-[11px]">
              {f.controls.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
              Effectiveness:{" "}
              <Pill tone={eff === "Strong" ? "good" : eff === "Weak" ? "bad" : "warn"}>
                {eff} · {reduction}%
              </Pill>
              {effOv ? (
                <span className="text-muted-foreground">Human override; AI said {f.eff}</span>
              ) : (
                <span className="text-muted-foreground">AI draft</span>
              )}
              {canReview && !effEdit ? (
                <button
                  className="text-primary underline"
                  onClick={() => {
                    setEffEdit(true);
                    setEffV(eff === "Moderate" && f.eff === "Moderate" ? "Weak" : eff);
                  }}
                >
                  Override effectiveness
                </button>
              ) : null}
            </div>
            {effOv ? <p className="mt-1 text-[10px] text-warning">Reason: {effOv.reason}</p> : null}
          </div>
          <ChevronRight className="hidden size-4 self-center text-muted-foreground sm:block" />
          <div className="rounded-md bg-surface p-3 ring-1 ring-border">
            <small className="text-[10px] uppercase text-muted-foreground">
              Residual risk · deterministic
            </small>
            <div className="mt-1">
              <Pill tone={riskTone(residual)}>
                {residual} · {residualNumeric}/100
              </Pill>
            </div>
            <small className="mt-2 block text-[10px] leading-4 text-muted-foreground">
              Code: {inherentScore} × (1 − {effectivenessRate[eff].toFixed(2)}) = {residualNumeric}.
              Floor = 1, so controls never eliminate risk.
            </small>
            {residual !== aiResidual ? (
              <small className="mt-1 block text-[10px] text-muted-foreground">
                AI baseline residual was {aiResidual}
              </small>
            ) : null}
          </div>
        </div>
        {effEdit ? (
          <div className="mt-3 space-y-2 rounded-md border border-warning/30 p-3">
            <label className="block text-xs font-medium">
              Control effectiveness
              <select
                value={effV}
                onChange={(e) => setEffV(e.target.value as Eff)}
                className="input-field mt-1"
              >
                {(["Strong", "Moderate", "Weak"] as Eff[]).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium">
              Why do you disagree with the AI's effectiveness?{" "}
              <span className="text-destructive">*</span>
              <textarea
                value={effWhy}
                onChange={(e) => setEffWhy(e.target.value)}
                placeholder="Example: Monitoring is designed but not yet operating."
                className="input-field mt-1 min-h-14 resize-none"
              />
            </label>
            <p className="text-[10px] text-muted-foreground">
              Residual will become <b>{residualOf(inherent, effV)}</b>.
            </p>
            {effTried && effErr ? (
              <p role="alert" className="text-[10px] text-destructive">
                {effErr}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEffEdit(false);
                  setEffTried(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEffTried(true);
                  if (effErr) return;
                  setEffOv({ eff: effV, reason: effWhy.trim() });
                  setEffEdit(false);
                  setEffWhy("");
                  setEffTried(false);
                }}
              >
                Save effectiveness
              </Button>
            </div>
          </div>
        ) : null}
        {review ? (
          <div
            className={cn(
              "mt-3 rounded-md p-3 text-xs",
              review.status === "Accepted"
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning",
            )}
          >
            <b>
              {review.status === "Accepted"
                ? "Accepted by D. Ferreira"
                : `Overridden ${f.level} → ${review.level} by D. Ferreira`}
            </b>
            {review.reason ? <p className="mt-1">Reason: {review.reason}</p> : null}
          </div>
        ) : null}
        {ov ? (
          <div className="mt-3 space-y-2 rounded-md border border-warning/30 p-3">
            <label className="block text-xs font-medium">
              Correct inherent rating <span className="text-destructive">*</span>
              <select
                value={lvl}
                onChange={(e) => setLvl(e.target.value as Risk)}
                className="input-field mt-1"
              >
                <option value="">Select from allowed scale…</option>
                {LV.map((x) => (
                  <option key={x} value={x}>
                    {x} ({SCORE[x]})
                  </option>
                ))}
              </select>
            </label>
            {tried && lvlErr ? (
              <p role="alert" className="text-[10px] text-destructive">
                {lvlErr}
              </p>
            ) : null}
            <label className="block text-xs font-medium">
              Why is the AI wrong? <span className="text-destructive">*</span>
              <textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="Example: Vendor already has 2 years of monitored service with our card team."
                className="input-field mt-1 min-h-16 resize-none"
              />
            </label>
            {tried && whyErr ? (
              <p role="alert" className="text-[10px] text-destructive">
                {whyErr}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOv(false);
                  setTried(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setTried(true);
                  if (lvlErr || whyErr || !lvl) return;
                  setReview({
                    status: "Overridden",
                    level: lvl,
                    score: SCORE[lvl],
                    reason: why.trim(),
                  });
                  setOv(false);
                  setWhy("");
                  setLvl("");
                  setTried(false);
                }}
              >
                Save override
              </Button>
            </div>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={!canReview} onClick={() => setReview({ status: "Accepted" })}>
            <Check />
            Accept finding
          </Button>
          <Button size="sm" variant="outline" disabled={!canReview} onClick={() => setOv(true)}>
            Override with reason
          </Button>
          {!canReview ? (
            <span className="text-[10px] text-muted-foreground">
              Only available in Analyst review stage (current: {stage}).
            </span>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
function AnalystPanel({
  stage,
  reviews,
  send,
  askInfo,
}: {
  stage: Stage;
  reviews: Record<number, Review>;
  send: () => void;
  askInfo: () => void;
}) {
  const findings = useFindings();
  if (stage !== "Analyst review") return null;
  const done = Object.keys(reviews).length;
  const all = done === findings.length;
  return (
    <Panel
      title="Analyst sign-off"
      help="The analyst must accept or override every AI finding before the ticket can go to Committee."
      action={
        <Pill tone={all ? "good" : "warn"}>
          {done}/{findings.length} reviewed
        </Pill>
      }
    >
      <p className="text-[11px] leading-5 text-muted-foreground">
        {all
          ? "All AI findings reviewed. Send to Committee to unlock the decision buttons."
          : "Review every finding above (click each risk row). The “Send to Committee” button unlocks when all are done."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={!all} onClick={send}>
          Send to Committee
          <ChevronRight />
        </Button>
        <Button size="sm" variant="outline" onClick={askInfo}>
          <HelpCircle />
          Request more information
        </Button>
      </div>
    </Panel>
  );
}
function NeedsInfo({ resolve }: { resolve: () => void }) {
  return (
    <div className="mt-3 rounded-md border border-warning/30 bg-warning/5 p-4 text-xs">
      <b className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-warning" />
        Missing information requested from the requester
      </b>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>Expected monthly onboarding volume and customer types</li>
        <li>Signed contract and data-protection terms with the ID provider</li>
        <li>Which document types will be accepted for business verification</li>
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Requested by M. Chen · 02 Oct 14:10 · AI decisions cannot be accepted until this is
        answered.
      </p>
      <Button size="sm" className="mt-3" onClick={resolve}>
        <Check />
        Mark information received — resume Analyst review
      </Button>
    </div>
  );
}
function DecisionPanel({
  stage,
  enabled,
  recorded,
  open,
}: {
  stage: Stage;
  enabled: boolean;
  recorded: Decision | null;
  open: () => void;
}) {
  return (
    <Panel
      title="Committee decision"
      action={
        <Pill tone={enabled ? "good" : "neutral"}>{enabled ? "Ready for vote" : "Locked"}</Pill>
      }
      help="Three committee members vote. The majority outcome is recorded with a rationale."
    >
      <p className="text-[11px] leading-5 text-muted-foreground">
        The committee chooses one of four outcomes by majority vote (quorum 3):
      </p>
      <ul className="mt-2 space-y-1.5">
        {OUTCOMES.map((x) => (
          <li
            key={x.o}
            className={cn(
              "rounded-md p-2 text-[11px] ring-1 ring-border",
              recorded?.outcome === x.o ? "bg-success/10 ring-success/40" : "bg-surface",
            )}
          >
            <b>{x.o}</b>
            <span className="block text-[10px] text-muted-foreground">{x.note}</span>
          </li>
        ))}
      </ul>
      {!enabled && !recorded ? (
        <div className="mt-3 flex gap-2 rounded-md bg-muted p-2 text-[10px] leading-4 text-muted-foreground">
          <LockKeyhole className="size-3.5 shrink-0" />
          <span>
            <b className="text-foreground">Why locked?</b> Voting opens only in the <b>Committee</b>{" "}
            stage. This ticket is in <b>{stage}</b>
            {stage === "Analyst review"
              ? " — the analyst must first review all AI findings and click “Send to Committee”."
              : stage === "Needs information"
                ? " — waiting for the requester’s missing information."
                : stage === "Uploaded" || stage === "AI analysis"
                  ? " — AI and analyst review have not finished yet."
                  : "."}
          </span>
        </div>
      ) : null}
      <Button size="sm" className="mt-3 w-full" disabled={!enabled || !!recorded} onClick={open}>
        <UsersRound />
        Open committee vote
      </Button>
      {recorded ? (
        <div className="mt-3 rounded-md bg-success/10 p-2 text-[10px] leading-4 text-success">
          <b>Recorded: {recorded.outcome}</b> · vote {recorded.tally}
          <p className="mt-1">{recorded.rationale}</p>
        </div>
      ) : null}
    </Panel>
  );
}
function AuditMini({ open }: { open: () => void }) {
  return (
    <Panel
      title="Audit history"
      action={
        <Button size="sm" variant="ghost" onClick={open}>
          View all
          <ChevronRight />
        </Button>
      }
    >
      <div className="space-y-3 text-[10px]">
        {[
          ["11:05", "Review opened"],
          ["09:14", "AI extraction complete"],
          ["09:12", "Document uploaded"],
        ].map((x) => (
          <div key={x[0]} className="flex gap-3">
            <span className="font-mono text-muted-foreground">{x[0]}</span>
            <span>{x[1]}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-border pt-3 text-[10px] leading-4 text-muted-foreground">
        Open the Audit history tab for actor, source version, evidence and rationale details.
      </p>
    </Panel>
  );
}
function Evidence({
  requestSummary,
  aiModel,
}: {
  requestSummary?: string | null | undefined;
  aiModel?: string | undefined;
}) {
  const findings = useFindings();
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <DocumentViewer requestSummary={requestSummary} aiModel={aiModel} />
      <Panel
        title="Evidence register"
        help="A controlled index of citations taken only from uploaded assessment documents and approved policy files."
      >
        <div className="mb-3 flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-[11px]">
          <LockKeyhole className="size-4 shrink-0 text-primary" />
          <p>
            <b>Where it comes from:</b> uploaded request documents and approved Policies. This
            prototype does not search the public internet. In production, private storage, access
            controls, malware scanning and encryption should be required.
          </p>
        </div>
        {findings.map((f, i) => (
          <div key={f.name} className="mb-2 rounded-md bg-surface p-3 ring-1 ring-border">
            <div className="flex gap-2 text-xs">
              <span className="font-mono text-primary">E-0{i + 1}</span>
              <b>{f.name}</b>
              <span className="ml-auto">
                <Pill tone="good">Verified</Pill>
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{f.evidence}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              <b className="text-foreground">Framework:</b> {f.framework}
            </p>
          </div>
        ))}
      </Panel>
    </div>
  );
}
type Ctl = {
  control: string;
  risk: string;
  owner: string;
  due: string;
  status: string;
  residual: string;
};
function Controls({ id }: { id: string }) {
  const findings = useFindings();
  const [rows, setRows] = useState<Ctl[]>(() =>
    findings.slice(0, 3).map((f, i) => ({
      control: f.control,
      risk: f.name,
      owner: ["Vendor Risk", "FCRM Ops", "Payments"][i] ?? f.owner,
      due: ["2026-10-09", "2026-10-16", "2026-10-12"][i]!,
      status: i === 2 ? "Active" : "Planned",
      residual: ["Medium", "Medium", "Low"][i]!,
    })),
  );
  const [adding, setAdding] = useState(false);
  const [n, setN] = useState<Ctl>({
    control: "",
    risk: findings[0]?.name ?? "Risk",
    owner: "",
    due: "",
    status: "Planned",
    residual: "Medium",
  });
  const upd = (i: number, k: keyof Ctl, v: string) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 text-xs leading-5">
        <b className="flex items-center gap-2 text-sm">
          <ListChecks className="size-4 text-primary" />
          What is the Control plan? (in plain words)
        </b>
        <p className="mt-1 text-muted-foreground">
          AI found <b>risks</b> (what could go wrong). A <b>control</b> is the action the bank will
          take to make that risk smaller. The Control plan is the to-do list of those actions — who
          does it, by when, and how risky things are once it’s done.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-md bg-surface p-3 ring-1 ring-border">
            <small className="text-[10px] uppercase text-muted-foreground">1 · Risk found</small>
            <p className="mt-1">
              New cross-border corridors to Mexico & Nigeria — <b className="text-warning">High</b>
            </p>
          </div>
          <div className="rounded-md bg-surface p-3 ring-1 ring-border">
            <small className="text-[10px] uppercase text-muted-foreground">
              2 · Control (the fix)
            </small>
            <p className="mt-1">
              Lower limits + extra monitoring for the first 90 days, owned by FCRM Ops
            </p>
          </div>
          <div className="rounded-md bg-surface p-3 ring-1 ring-border">
            <small className="text-[10px] uppercase text-muted-foreground">
              3 · Residual risk (after fix)
            </small>
            <p className="mt-1">
              Drops to <b>Medium</b> — Committee approves based on this
            </p>
          </div>
        </div>
      </div>
      <Panel
        title={`Control plan · ${id}`}
        help="Safeguards that reduce each identified risk."
        action={
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus />
            Add control
          </Button>
        }
      >
        {adding ? (
          <div className="mb-4 grid gap-2 rounded-md border border-border p-3 md:grid-cols-6">
            <input
              className="input-field md:col-span-2"
              placeholder="Control action"
              value={n.control}
              onChange={(e) => setN({ ...n, control: e.target.value })}
            />
            <select
              className="input-field"
              value={n.risk}
              onChange={(e) => setN({ ...n, risk: e.target.value })}
            >
              {findings.map((f) => (
                <option key={f.name}>{f.name}</option>
              ))}
            </select>
            <input
              className="input-field"
              placeholder="Owner"
              value={n.owner}
              onChange={(e) => setN({ ...n, owner: e.target.value })}
            />
            <input
              type="date"
              className="input-field"
              value={n.due}
              onChange={(e) => setN({ ...n, due: e.target.value })}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!n.control.trim() || !n.owner.trim() || !n.due}
                onClick={() => {
                  setRows((r) => [...r, n]);
                  setAdding(false);
                  setN({ ...n, control: "", owner: "", due: "" });
                }}
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                <X />
              </Button>
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="border-b border-border text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="pb-3">Control (the fix)</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Status</th>
                <th>Residual risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="max-w-md py-4 pr-5">
                    <b>{c.control}</b>
                    <small className="mt-1 block text-muted-foreground">
                      Reduces {c.risk.toLowerCase()}
                    </small>
                  </td>
                  <td>{c.owner}</td>
                  <td>
                    <input
                      type="date"
                      aria-label="Control due date"
                      value={c.due}
                      onChange={(e) => upd(i, "due", e.target.value)}
                      className="rounded-md border border-input bg-surface px-2 py-1 font-mono text-[11px]"
                    />
                  </td>
                  <td>
                    <select
                      aria-label="Control status"
                      value={c.status}
                      onChange={(e) => upd(i, "status", e.target.value)}
                      className="rounded-md border border-input bg-surface px-2 py-1 text-[11px]"
                    >
                      {["Not started", "Planned", "Active", "Verified"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label="Residual risk"
                      value={c.residual}
                      onChange={(e) => upd(i, "residual", e.target.value)}
                      className="rounded-md border border-input bg-surface px-2 py-1 text-[11px]"
                    >
                      {["High", "Medium", "Low"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
function AuditHistory({
  assessment: a,
  aiResult,
}: {
  assessment: Assessment;
  aiResult?: AiAnalysisResult | null;
}) {
  const aiRow = aiResult
    ? [
        new Date(aiResult.generatedAt).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        "Guardian AI (live)",
        "Facts, findings and summary drafted",
        aiResult.model,
        `${aiResult.facts.length} facts · ${aiResult.findings.length} findings`,
      ]
    : null;
  const rows = [
    ["02 Oct 12:34", "D. Ferreira", "Analyst review opened", "Authenticated session", "—"],
    [
      "02 Oct 10:40",
      "Rules engine",
      "Residual scores calculated",
      "Risk model v1.4 (code)",
      "Deterministic — no LLM",
    ],
    ...(aiRow
      ? [aiRow]
      : [
          [
            "02 Oct 09:14",
            "Guardian AI",
            "Facts and citations drafted",
            "Extractor v2.8",
            "6 citations",
          ],
        ]),
    ["02 Oct 09:12", "M. Chen", "Source document uploaded", a.file, "SHA-256: 4d8…a21"],
  ];
  return (
    <div className="mt-4">
      <Panel
        title="Complete audit history"
        help="A chronological, tamper-evident record of who did what, when, using which source or model, and why."
        action={
          <Button size="sm" variant="outline">
            Export record
          </Button>
        }
      >
        <p className="mb-4 text-[11px] text-muted-foreground">
          This view stores source hashes, AI/model versions, extracted facts, reviewer changes,
          control updates, decision rationales and timestamps. It does not store passwords or
          unrelated personal data.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="border-b border-border text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="pb-3">Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Source / version</th>
                <th>Evidence / reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]} className="border-b border-border/50">
                  <td className="py-4 font-mono">{r[0]}</td>
                  <td>{r[1]}</td>
                  <td className="font-medium">{r[2]}</td>
                  <td>{r[3]}</td>
                  <td className="text-muted-foreground">{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
function CommitteeVoteDialog({ close, save }: { close: () => void; save: (d: Decision) => void }) {
  const findings = useFindings();
  const [votes, setVotes] = useState<Record<string, Outcome | "">>({});
  const [reason, setReason] = useState("");
  const [conds, setConds] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const counts = OUTCOMES.map((x) => ({
    o: x.o,
    n: MEMBERS.filter((m) => votes[m] === x.o).length,
  }));
  const allVoted = MEMBERS.every((m) => votes[m]);
  const top = counts.find((c) => c.n >= 2);
  const outcome = top?.o;
  const errs = [
    !allVoted && "All three members must vote.",
    allVoted && !top && "No majority — members must revote until two agree.",
    outcome === "Approved with conditions" &&
      !conds.length &&
      "Select at least one named condition.",
    reason.trim().length < 8 && "A decision rationale is mandatory (at least 8 characters).",
  ].filter(Boolean) as string[];
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="frost max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border p-5 shadow-xl">
        <div className="flex items-center">
          <h2 className="font-semibold">Committee vote</h2>
          <Button className="ml-auto" size="icon" variant="ghost" onClick={close}>
            <X />
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Each member records a vote. The majority outcome becomes the decision.
        </p>
        <div className="mt-4 space-y-2">
          {MEMBERS.map((m) => (
            <label key={m} className="flex items-center gap-3 text-xs">
              <span className="w-36 font-medium">{m}</span>
              <select
                aria-label={`Vote for ${m}`}
                value={votes[m] ?? ""}
                onChange={(e) => setVotes((v) => ({ ...v, [m]: e.target.value as Outcome }))}
                className="input-field flex-1"
              >
                <option value="">— vote —</option>
                {OUTCOMES.map((x) => (
                  <option key={x.o}>{x.o}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {counts.map((c) => (
            <div
              key={c.o}
              className={cn(
                "flex justify-between rounded-md px-2 py-1 text-[11px] ring-1 ring-border",
                outcome === c.o && "bg-success/10 ring-success/40",
              )}
            >
              <span>{c.o}</span>
              <b className="font-mono">{c.n}</b>
            </div>
          ))}
        </div>
        {outcome ? (
          <p className="mt-2 text-xs">
            Majority outcome: <b>{outcome}</b>
          </p>
        ) : null}
        {outcome === "Approved with conditions" ? (
          <div className="mt-3 rounded-md border border-border p-3">
            <b className="text-xs">Named conditions (become monitored obligations)</b>
            <div className="mt-2 space-y-1.5">
              {findings.map((f) => (
                <label key={f.name} className="flex items-start gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={conds.includes(f.control)}
                    onChange={(e) =>
                      setConds((c) =>
                        e.target.checked ? [...c, f.control] : c.filter((x) => x !== f.control),
                      )
                    }
                    className="mt-0.5"
                  />
                  <span>
                    {f.control} <span className="text-muted-foreground">· {f.owner}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <label className="mt-4 block text-xs font-medium" htmlFor="reason">
          Decision rationale <span className="text-destructive">*</span>
        </label>
        <textarea
          id="reason"
          maxLength={240}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Example: Approved, conditional on transfer caps and enhanced monitoring for 90 days."
          className="mt-2 min-h-20 w-full resize-none rounded-md border border-input bg-surface p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {tried && errs.length ? (
          <ul role="alert" className="mt-2 list-disc pl-4 text-[10px] text-destructive">
            {errs.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            variant={outcome === "Rejected" ? "destructive" : "default"}
            onClick={() => {
              setTried(true);
              if (errs.length || !outcome) return;
              const tally = `${top!.n}–${3 - top!.n}`;
              save({
                outcome,
                rationale: reason.trim(),
                tally,
                conditions:
                  outcome === "Approved with conditions"
                    ? conds.map((t, i) => ({
                        text: t,
                        owner: findings.find((f) => f.control === t)?.owner ?? "Owner",
                        due: ["2026-10-31", "2026-12-31", "2027-01-15", "2027-01-31", "2027-02-28"][
                          i
                        ]!,
                        status: "Open",
                      }))
                    : [],
              });
            }}
          >
            Record decision
          </Button>
        </div>
      </div>
    </div>
  );
}
function DeltaPanel({
  reviews,
  effOv,
}: {
  reviews: Record<number, Review>;
  effOv: Record<number, EffOv>;
}) {
  const findings = useFindings();
  const rows = findings.map((f, i) => {
    const r = reviews[i];
    const inh = r?.level ?? f.level;
    const e = effOv[i]?.eff ?? f.eff;
    return {
      f,
      r,
      inh,
      e,
      eo: effOv[i],
      res: residualOf(inh, e),
      aiRes: residualOf(f.level, f.eff),
    };
  });
  const diff = rows.filter((x) => x.r?.status === "Overridden" || x.eo).length;
  return (
    <Panel
      title="AI vs Analyst — where humans disagreed"
      help="What the committee needs: the AI's call, the analyst's call, and why."
      action={
        <Pill tone={diff ? "warn" : "good"}>
          {diff} of {findings.length} changed
        </Pill>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[11px]">
          <thead className="border-b border-border text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="pb-2">Factor</th>
              <th>AI said</th>
              <th>Analyst</th>
              <th>Residual</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.f.name} className="border-b border-border/50 align-top">
                <td className="py-2 pr-2 font-medium">{x.f.name}</td>
                <td className="pr-2">
                  {x.f.level}·{x.f.score}
                  <small className="block text-muted-foreground">controls {x.f.eff}</small>
                </td>
                <td className="pr-2">
                  {x.r?.status === "Overridden" ? (
                    <b className="text-warning">Overrode → {x.r.level}</b>
                  ) : x.r ? (
                    <span className="text-success">Accepted</span>
                  ) : (
                    <span className="text-muted-foreground">Not reviewed</span>
                  )}
                  {x.eo ? (
                    <small className="block text-warning">controls → {x.eo.eff}</small>
                  ) : null}
                </td>
                <td className="pr-2">
                  {x.aiRes === x.res ? (
                    x.res
                  ) : (
                    <span>
                      {x.aiRes} → <b>{x.res}</b>
                    </span>
                  )}
                </td>
                <td className="text-muted-foreground">
                  {[x.r?.reason, x.eo?.reason].filter(Boolean).join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
function ConditionsPanel({
  decision,
  update,
}: {
  decision: Decision;
  update: (c: Cond[]) => void;
}) {
  return (
    <Panel
      title="Monitored conditions"
      help="Conditions attached to the approval. Each is tracked until met; a breach reopens the assessment."
      action={
        <Pill tone="warn">{decision.conditions.filter((c) => c.status !== "Met").length} open</Pill>
      }
    >
      <div className="space-y-2">
        {decision.conditions.map((c, i) => (
          <div key={c.text} className="rounded-md bg-surface p-2.5 text-[11px] ring-1 ring-border">
            <b className="font-mono text-primary">C-{i + 1}</b> {c.text}
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{c.owner}</span>
              <span className="font-mono">due {fmtDate(c.due)}</span>
              <select
                aria-label="Condition status"
                value={c.status}
                onChange={(e) =>
                  update(
                    decision.conditions.map((x, j) =>
                      j === i ? { ...x, status: e.target.value } : x,
                    ),
                  )
                }
                className="ml-auto rounded-md border border-input bg-surface px-1.5 py-0.5 text-[10px]"
              >
                {["Open", "Monitoring", "Met", "Breached"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
function poStatus(s: Stage) {
  return {
    Uploaded:
      "Received — AI will analyze within minutes; an analyst reviews before any decision. Est. decision in 2 days.",
    "AI analysis": "AI analysis in progress. Est. decision in 2 days.",
    "Analyst review": "Your request is in Analyst review, est. decision in 2 days.",
    "Needs information":
      "Action needed: the analyst asked you for more information. The clock pauses until you reply.",
    Committee: "With the risk committee for a vote. Est. decision in 1 day.",
    Decision:
      "Decided: Approved with conditions. You must meet the named conditions before launch.",
  }[s];
}
function MyRequests({ rows }: { rows: Assessment[] }) {
  return (
    <>
      <div className="mb-4 flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
        <Info className="size-4 shrink-0 text-primary" />
        <p>
          <b>Read-only status for Product Owners.</b> Track every change you submitted. Target time
          to decision: <b>2 days</b> (vs 15–20 days manual). Outcomes: approved, approved with
          conditions, deferred or rejected.
        </p>
      </div>
      <div className="space-y-3">
        {rows.map((a) => (
          <div key={a.id} className="frost rounded-lg border border-border/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs">{a.id}</span>
              <b className="text-sm">{a.title}</b>
              <Pill>{changeTypeFor(a.id)}</Pill>
              <span className="ml-auto">
                <Pill
                  tone={
                    a.stage === "Decision"
                      ? "good"
                      : a.stage === "Needs information"
                        ? "bad"
                        : "warn"
                  }
                >
                  {a.stage}
                </Pill>
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{poStatus(a.stage)}</p>
            <div className="mt-3 flex gap-1">
              {stages.map((s, i) => (
                <div key={s.name} className="flex-1">
                  <div
                    className={cn(
                      "h-1.5 rounded-full",
                      i < a.progress || a.stage === "Decision"
                        ? "bg-success"
                        : i === a.progress
                          ? "bg-warning"
                          : "bg-border",
                    )}
                  />
                  <small className="mt-1 block text-[9px] text-muted-foreground">{s.name}</small>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AuditLedger() {
  const stored = [
    {
      title: "Evidence integrity",
      detail: "File name, hash, citation and policy version",
      Icon: FileCheck2,
    },
    {
      title: "AI trace",
      detail: "Extracted facts, model version and draft ratings",
      Icon: ShieldCheck,
    },
    {
      title: "Human judgement",
      detail: "Acceptances, overrides and required rationales",
      Icon: UsersRound,
    },
    { title: "Timeline", detail: "Every status, control and decision change", Icon: Clock3 },
  ];
  return (
    <Panel
      title="What the Audit Ledger stores"
      help="The cross-assessment record used for traceability, internal audit and regulatory review."
    >
      <div className="grid gap-3 md:grid-cols-4">
        {stored.map(({ title, detail, Icon }) => (
          <div key={title} className="rounded-md bg-surface p-4 ring-1 ring-border">
            <Icon className="size-4 text-primary" />
            <b className="mt-3 block text-xs">{title}</b>
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {assessments.slice(1, 5).map((a) => (
          <Link
            key={a.id}
            to="/assessment/$assessmentId"
            params={{ assessmentId: a.id }}
            className="grid grid-cols-[6rem_1fr_9rem] items-center rounded-md border border-border p-3 text-xs hover:bg-accent"
          >
            <span className="font-mono">{a.id}</span>
            <span>
              <b>Latest event:</b> {a.stage}
            </span>
            <span className="text-right text-muted-foreground">Open history →</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
function Policies() {
  const [policies, setPolicies] = useState([
    { name: "Cross-border payments standard", version: "v3.2 · Active", controls: "12 controls" },
    { name: "Third-party due diligence", version: "v5.1 · Active", controls: "18 controls" },
    { name: "Customer risk methodology", version: "v4.0 · Active", controls: "24 controls" },
  ]);
  const [open, setOpen] = useState(false);
  const [pn, setPn] = useState("");
  const [pv, setPv] = useState("v1.0");
  const [pf, setPf] = useState("");
  return (
    <>
      <div className="mb-4 flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
        <Info className="size-4 shrink-0 text-primary" />
        <p>
          <b>Yes — Policies are approved compliance and risk documents.</b> AI reads them alongside
          the request to identify obligations and suggest controls. Only active, approved versions
          should ground an assessment; analysts remain responsible for verification.
        </p>
      </div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus />
          Add policy
        </Button>
      </div>
      {open ? (
        <Panel
          className="mb-4"
          title="Add a new policy"
          help="Upload an approved compliance or risk document so AI can use it."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Policy name">
              <input
                className="input-field mt-1"
                value={pn}
                onChange={(e) => setPn(e.target.value)}
                placeholder="e.g. Sanctions screening standard"
              />
            </Field>
            <Field label="Version">
              <input
                className="input-field mt-1"
                value={pv}
                onChange={(e) => setPv(e.target.value)}
              />
            </Field>
            <Field label="Policy document">
              <input
                type="file"
                className="input-field mt-1"
                onChange={(e) => setPf(e.target.files?.[0]?.name ?? "")}
              />
            </Field>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!pn.trim() || !pf}
              onClick={() => {
                setPolicies((p) => [
                  ...p,
                  { name: pn.trim(), version: `${pv} · Active`, controls: "New · 0 controls" },
                ]);
                setOpen(false);
                setPn("");
                setPf("");
              }}
            >
              Save policy
            </Button>
          </div>
        </Panel>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        {policies.map((policy) => (
          <Panel
            key={policy.name}
            title={policy.name}
            action={<BookOpen className="size-4 text-primary" />}
          >
            <p className="text-xs text-muted-foreground">{policy.version}</p>
            <div className="mt-5 flex justify-between">
              <span className="font-mono text-[10px]">{policy.controls}</span>
              <Button size="sm" variant="outline">
                View policy
              </Button>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
function Committee() {
  const a = assessments.find((x) => x.stage === "Committee");
  if (!a) return null;
  return (
    <Panel
      title="Committee agenda"
      help="Assessments with verified evidence awaiting a committee vote."
    >
      <div className="flex items-center gap-4 rounded-md bg-surface p-4 ring-1 ring-border">
        <div>
          <Pill tone="bad">{a.risk}</Pill>
          <b className="mt-2 block text-sm">{a.title}</b>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Voters: {MEMBERS.join(", ")} · Outcomes: approved, approved with conditions, deferred,
            rejected · AI vs analyst delta included
          </p>
        </div>
        <Button className="ml-auto" asChild>
          <Link to="/assessment/$assessmentId" params={{ assessmentId: a.id }}>
            Review & vote
            <ChevronRight />
          </Link>
        </Button>
      </div>
    </Panel>
  );
}

export function NewAssessmentPage() {
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [ctype, setCtype] = useState("");
  const [summary, setSummary] = useState("");
  const [selected, setSelected] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [tried, setTried] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const chooseFiles = (files: FileList | null) => {
    if (!files) return;
    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]);
    const incoming = Array.from(files);
    const invalid = incoming.find((f) => !allowed.has(f.type) || f.size > 30 * 1024 * 1024);
    if (invalid) {
      setFileError(`${invalid.name} is not an accepted file or exceeds 30 MB.`);
      return;
    }
    setFileError("");
    setSelected((prev) =>
      [...prev, ...incoming].filter(
        (f, i, a) => a.findIndex((x) => x.name === f.name && x.size === f.size) === i,
      ),
    );
  };
  const errs = {
    name: !name.trim() ? "Assessment title is required." : "",
    owner: !owner.trim()
      ? "Request owner is required — every change needs an accountable owner."
      : "",
    ctype: !ctype ? "Choose a change type — it decides which risk factors are evaluated." : "",
    summary: summary.trim().length < 20 ? "Describe the change in at least 20 characters." : "",
    docs: !selected.length ? "Attach at least one source document." : "",
  };
  const errList = Object.values(errs).filter(Boolean);
  const E = ({ m }: { m: string }) =>
    tried && m ? (
      <p role="alert" className="mt-1 text-[10px] font-normal text-destructive">
        {m}
      </p>
    ) : null;
  return (
    <AppShell active="new">
      <Topbar title="New Assessment" crumb="Create request" />
      <div className="mx-auto max-w-4xl p-4 lg:p-7">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft />
            Assessment workspace
          </Link>
        </Button>
        <div className="mt-4">
          <h1 className="text-2xl font-semibold">Start a new risk assessment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe the proposed change and attach the source documents the assessment must use.
          </p>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-md border border-ai/25 bg-ai/5 p-3 text-xs">
          <Info className="mt-0.5 size-4 shrink-0 text-ai" />
          <p>
            <b>What happens next:</b> AI will analyze your documents within minutes; an analyst
            reviews every finding before any decision, then the committee votes. Typical decision in
            2 days.
          </p>
        </div>
        {submitted && submittedId ? (
          <div className="mt-6 rounded-lg border border-success/30 bg-success/10 p-6">
            <Check className="size-6 text-success" />
            <h2 className="mt-3 font-semibold">Request {submittedId} submitted</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {ctype} · {selected.length} source document{selected.length === 1 ? "" : "s"} · owner{" "}
              {owner}
            </p>
            <div className="mt-4 rounded-md bg-surface p-3 text-xs ring-1 ring-border">
              <b>Your request status (read-only)</b>
              <p className="mt-1 text-muted-foreground">{poStatus("Uploaded")}</p>
              <div className="mt-3 flex gap-1">
                {stages.map((s, i) => (
                  <div key={s.name} className="flex-1">
                    <div
                      className={cn("h-1.5 rounded-full", i === 0 ? "bg-warning" : "bg-border")}
                    />
                    <small className="mt-1 block text-[9px] text-muted-foreground">{s.name}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link
                  to="/assessment/$assessmentId"
                  params={{ assessmentId: submittedId ?? "" }}
                >
                  Open {submittedId} · Start AI
                  <ChevronRight />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/" search={{ view: "list" }}>
                  Assessments List
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/" search={{ view: "requests" }}>
                  My requests
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {tried && errList.length ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs lg:col-span-3"
              >
                <b className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-4" />
                  Submission rejected — {errList.length} required item
                  {errList.length > 1 ? "s" : ""} missing
                </b>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {errList.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Panel className="lg:col-span-2" title="Request details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Assessment title *">
                  <input
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. New payment corridor"
                    className="input-field"
                  />
                  <E m={errs.name} />
                </Field>
                <Field label="Request owner *">
                  <input
                    maxLength={100}
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Name or team"
                    className="input-field"
                  />
                  <E m={errs.owner} />
                </Field>
                <Field label="Change type *">
                  <select
                    value={ctype}
                    onChange={(e) => setCtype(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select change type…</option>
                    {Object.keys(changeTypes).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <E m={errs.ctype} />
                </Field>
                <Field label="Target launch date">
                  <input type="date" className="input-field" />
                </Field>
              </div>
              {ctype ? (
                <p className="mt-3 rounded-md bg-surface p-2 text-[11px] ring-1 ring-border">
                  Risk factors the engine will evaluate first:{" "}
                  <b>{changeTypes[ctype]!.join(", ")}</b>
                </p>
              ) : null}
              <div className="mt-4">
                <Field label="Change summary *">
                  <textarea
                    maxLength={1000}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="input-field mt-2 min-h-28 resize-none"
                    placeholder="What is changing, who is affected, and where will it operate?"
                  />
                  <E m={errs.summary} />
                </Field>
              </div>
            </Panel>
            <Panel
              title="Source documents *"
              help="Upload one or more request and supporting files. Evidence is drawn only from these files and approved Policies."
            >
              <button
                type="button"
                onClick={() => file.current?.click()}
                className={cn(
                  "grid min-h-40 w-full place-items-center rounded-md border border-dashed bg-surface p-4 text-center",
                  tried && errs.docs ? "border-destructive" : "border-border",
                )}
              >
                <span>
                  <Upload className="mx-auto size-5 text-primary" />
                  <b className="mt-2 block text-xs">Choose source files</b>
                  <small className="text-[10px] text-muted-foreground">
                    Multiple files · JPG, PDF, PNG, DOCX, XLSX · 30 MB max each
                  </small>
                </span>
              </button>
              <input
                ref={file}
                type="file"
                multiple
                accept=".jpg,.jpeg,.pdf,.png,.docx,.xlsx"
                className="hidden"
                onChange={(e) => chooseFiles(e.target.files)}
              />
              <E m={errs.docs} />
              {fileError ? (
                <p role="alert" className="mt-2 text-[10px] text-destructive">
                  {fileError}
                </p>
              ) : null}
              {selected.length ? (
                <div className="mt-3 space-y-2">
                  {selected.map((f, i) => (
                    <div
                      key={`${f.name}-${f.size}`}
                      className="flex items-center gap-2 rounded-md bg-surface px-2 py-1.5 text-[10px] ring-1 ring-border"
                    >
                      <FileText className="size-3.5 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="text-muted-foreground">
                        {(f.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${f.name}`}
                        onClick={() => setSelected((x) => x.filter((_, j) => j !== i))}
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex items-start gap-2 text-[10px] leading-4 text-muted-foreground">
                <LockKeyhole className="mt-0.5 size-3 shrink-0" />
                Executable files are not accepted. Production uploads should be encrypted,
                access-controlled and malware-scanned.
              </div>
            </Panel>
            <div className="flex justify-end gap-2 lg:col-span-3">
              <Button variant="outline" asChild>
                <Link to="/">Cancel</Link>
              </Button>
              <Button
                onClick={() => {
                  void (async () => {
                    setTried(true);
                    if (errList.length) return;
                    const documents = await Promise.all(selected.map(readFileForAiAnalysis));
                    const knownIds = [
                      ...assessments.map((a) => a.id),
                      ...loadSubmittedAssessments().map((r) => r.id),
                    ];
                    const assessmentId = nextAssessmentId(knownIds);
                    savePendingAssessment({
                      assessmentId,
                      title: name.trim(),
                      owner: owner.trim(),
                      changeType: ctype,
                      changeSummary: summary.trim(),
                      documents,
                    });
                    setSubmittedId(assessmentId);
                    setSubmitted(true);
                  })();
                }}
              >
                Submit request
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium">
      {label}
      {children}
    </label>
  );
}

function downloadDocument(name: string) {
  const blob = new Blob(
    [
      `Risk Guardian Pro source-document preview\n\n${name}\nThis prototype download represents the uploaded source file.`,
    ],
    { type: "text/plain" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
const staticAiSummary =
  "The request proposes a pilot for international transfers from the United States to Mexico and Nigeria for established retail customers. It introduces higher daily limits and relies on Vera ID for remote verification. The main review areas are third-party oversight, corridor monitoring, transaction velocity, and completion of the provider's data-protection agreement.";
function DocumentViewer({
  requestSummary,
  aiModel,
}: {
  requestSummary?: string | null | undefined;
  aiModel?: string | undefined;
}) {
  const summary = requestSummary ?? staticAiSummary;
  return (
    <Panel
      title="Document viewer"
      help="All uploaded documents are displayed together without pagination and can be downloaded."
      action={<Pill tone="neutral">{demoAssessmentDocuments.length} documents</Pill>}
    >
      <div className="mb-4 rounded-md border border-ai/25 bg-ai/5 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-ai" />
          <b className="text-xs">AI request summary</b>
          <Pill tone="ai">
            {requestSummary ? `Live · ${aiModel ?? "Anthropic"}` : "AI derived"}
          </Pill>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{summary}</p>
      </div>
      <div className="space-y-4">
        {demoAssessmentDocuments.map((doc) => (
          <article key={doc.name} className="overflow-hidden rounded-md border border-border">
            <header className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-3 py-2">
              <FileText className="size-4 text-primary" />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-xs">{doc.name}</b>
                <small className="text-[10px] text-muted-foreground">{doc.meta}</small>
              </div>
              <Button size="sm" variant="outline" onClick={() => downloadDocument(doc.name)}>
                <Download />
                Download
              </Button>
            </header>
            <div className="space-y-5 p-5 font-serif text-sm leading-7">
              {doc.sections.map((section, i) => (
                <section key={`${section.title}-${i}`}>
                  <h4 className="mb-2 font-sans text-xs font-semibold uppercase text-primary">
                    {section.title}
                  </h4>
                  {section.body.map((body, j) => (
                    <p key={j} className="mb-1">
                      {body}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- AI follow-up assistant + second-cycle re-review ---------- */
type Msg = { role: "user" | "ai"; text: string; cites?: string[] };
function groundedAnswer(q: string, f: FindingItem): Msg {
  const ql = q.toLowerCase();
  const src = [f.evidence, f.framework];
  if (ql.includes("why"))
    return {
      role: "ai",
      text: `${f.name} is rated ${f.level} (${f.score}/100) because: ${f.reason}`,
      cites: src,
    };
  if (ql.includes("evidence") || ql.includes("support"))
    return {
      role: "ai",
      text: `The rating rests on this uploaded passage: ${f.evidence} No external sources were used.`,
      cites: src,
    };
  if (ql.includes("control") || ql.includes("reduce") || ql.includes("mitigat"))
    return {
      role: "ai",
      text: `Suggested control: ${f.control} If applied, the expected residual rating drops by one level. An analyst must confirm.`,
      cites: [...src, "§5 Monitoring, page 9"],
    };
  return {
    role: "ai",
    text: `Based only on the uploaded document, the closest relevant passage for ${f.name} is ${f.evidence} I can't answer beyond what the sources contain.`,
    cites: src,
  };
}
function aiContextFromResult(
  aiResult: AiAnalysisResult | null | undefined,
  findings: FindingItem[],
) {
  const requestSummary = aiResult?.requestSummary ?? "Assessment under review.";
  return {
    requestSummary,
    findings: findings.map((f) => ({
      name: f.name,
      level: f.level,
      score: f.score,
      reason: f.reason,
      evidence: f.evidence,
      framework: f.framework,
      control: f.control,
    })),
  };
}
function FollowUpPanel({
  stage,
  active,
  assessmentId,
  aiResult,
  onRevise,
}: {
  stage: Stage;
  active: number;
  assessmentId: string;
  aiResult: AiAnalysisResult | null;
  onRevise: (i: number, r: Review) => void;
}) {
  const findings = useFindings();
  const f = findings[active];
  const [msgs, setMsgs] = useState<Record<number, Msg[]>>({});
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [cycle, setCycle] = useState<Record<number, string>>({});
  if (stage !== "Analyst review" || !f) return null;
  const thread = msgs[active] ?? [];
  const short = f.name.replace(" risk", "").toLowerCase();
  const ask = (text: string) => {
    if (!text.trim()) return;
    setMsgs((m) => ({ ...m, [active]: [...(m[active] ?? []), { role: "user", text }] }));
    setQ("");
    void (async () => {
      try {
        if (aiResult) {
          const res = await askAssessmentFollowUp({
            data: {
              assessmentId,
              factorName: f.name,
              question: text,
              analysisContext: aiContextFromResult(aiResult, findings),
            },
          });
          setMsgs((m) => ({
            ...m,
            [active]: [...(m[active] ?? []), { role: "ai", text: res.answer, cites: res.cites }],
          }));
        } else {
          setMsgs((m) => ({ ...m, [active]: [...(m[active] ?? []), groundedAnswer(text, f)] }));
        }
      } catch {
        setMsgs((m) => ({ ...m, [active]: [...(m[active] ?? []), groundedAnswer(text, f)] }));
      }
    })();
  };
  const rereview = () => {
    setBusy(true);
    void (async () => {
      try {
        if (aiResult) {
          const res = await rerunFindingWithAi({
            data: {
              assessmentId,
              factorName: f.name,
              analystNote: note.trim(),
              analysisContext: aiContextFromResult(aiResult, findings),
            },
          });
          const result = res.summary;
          setCycle((c) => ({ ...c, [active]: result }));
          setMsgs((m) => ({
            ...m,
            [active]: [
              ...(m[active] ?? []),
              { role: "user", text: `Re-review requested: ${note}` },
              { role: "ai", text: result, cites: [f.evidence] },
            ],
          }));
          if (res.level !== f.level)
            onRevise(active, {
              status: "Overridden",
              level: res.level,
              score: SCORE[res.level],
              reason: `AI 2nd cycle after analyst note: ${note}`,
            });
        } else {
          const lvls: Risk[] = ["Critical", "High", "Medium", "Low"];
          const idx = Math.min(
            3,
            lvls.indexOf(f.level) +
              (note.toLowerCase().includes("control") || note.toLowerCase().includes("history")
                ? 1
                : 0),
          );
          const lvl = lvls[idx]!;
          const result =
            lvl === f.level
              ? `AI second cycle confirms ${f.level} (${f.score}). Analyst note considered: "${note}".`
              : `AI second cycle revises to ${lvl}.`;
          setCycle((c) => ({ ...c, [active]: result }));
          setMsgs((m) => ({
            ...m,
            [active]: [
              ...(m[active] ?? []),
              { role: "user", text: `Re-review requested: ${note}` },
              { role: "ai", text: result, cites: [f.evidence] },
            ],
          }));
          if (lvl !== f.level)
            onRevise(active, {
              status: "Overridden",
              level: lvl,
              score: SCORE[lvl],
              reason: `AI 2nd cycle after analyst note: ${note}`,
            });
        }
      } finally {
        setNote("");
        setBusy(false);
      }
    })();
  };
  return (
    <Panel
      title="Follow-up assistant"
      help="Ask the AI about the selected finding, or send it back to the AI for a second review cycle. Answers use only the uploaded documents."
      action={<Pill tone="ai">{aiResult ? "Live Anthropic" : "Source-grounded"}</Pill>}
    >
      <p className="text-[11px] text-muted-foreground">
        Asking about: <b className="text-foreground">{f.name}</b> — select another risk row above to
        switch.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[
          `Why is ${short} risk ${f.level.toLowerCase()}?`,
          "What evidence supports this?",
          "What controls could reduce this risk?",
        ].map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] text-primary hover:bg-primary/10"
          >
            {s}
          </button>
        ))}
      </div>
      {thread.length ? (
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {thread.map((m, i) => (
            <div
              key={i}
              className={cn(
                "rounded-md p-2.5 text-xs",
                m.role === "user" ? "ml-8 bg-muted" : "mr-8 bg-primary/5 ring-1 ring-primary/20",
              )}
            >
              <b className="text-[10px] uppercase text-muted-foreground">
                {m.role === "user" ? "D. Ferreira" : "AI assistant"}
              </b>
              <p className="mt-1 leading-5">{m.text}</p>
              {m.cites ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.cites.map((c) => (
                    <span
                      key={c}
                      className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border"
                    >
                      📄 {c}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask a follow-up question…"
          className="input-field flex-1"
        />
        <Button size="sm" type="submit" disabled={!q.trim()}>
          Ask
        </Button>
      </form>
      <div className="mt-4 rounded-md border border-warning/30 bg-warning/5 p-3">
        <b className="text-xs">Send back to AI for a second review cycle</b>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Not sure the AI got it right? Add what it should reconsider. The AI re-assesses this
          finding and the result is logged to audit history; you still accept or override.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Example: Vendor has 2 years of monitored history with our card team — reconsider."
          className="input-field mt-2 min-h-14 resize-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {cycle[active] ? (
            <Pill tone="ai">Cycle 2 complete</Pill>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              Cycle 1 · original AI analysis
            </span>
          )}
          <Button size="sm" disabled={note.trim().length < 8 || busy} onClick={rereview}>
            {busy ? "AI re-reviewing…" : "Request AI re-review"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
