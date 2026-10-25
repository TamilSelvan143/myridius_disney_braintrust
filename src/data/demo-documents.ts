export type DemoDocument = {
  name: string;
  meta: string;
  sections: { title: string; body: string[] }[];
};

export const demoAssessmentDocuments: DemoDocument[] = [
  {
    name: "international-transfer-brief.pdf",
    meta: "PDF · 12 pages · 2.4 MB",
    sections: [
      {
        title: "Purpose and scope",
        body: [
          "Request for a new-product risk assessment before pilot launch.",
          "Access is restricted to customers active for at least 90 days with completed KYC.",
        ],
      },
      {
        title: "Limits and markets",
        body: [
          "Daily outbound limit increases from $5,000 to $25,000.",
          "Initial destination markets are Mexico and Nigeria.",
        ],
      },
    ],
  },
  {
    name: "corridor-volume-model.xlsx",
    meta: "XLSX · 3 sheets · 840 KB",
    sections: [
      {
        title: "Volume assumptions",
        body: [
          "Expected 4,000-6,500 transfers per month during the first quarter.",
          "Average transfer value is estimated at $1,200.",
        ],
      },
    ],
  },
  {
    name: "vera-id-due-diligence.docx",
    meta: "DOCX · 8 pages · 1.1 MB",
    sections: [
      {
        title: "Provider overview",
        body: [
          "Vera ID will perform remote identity and document verification.",
          "The data-protection agreement remains under legal review.",
        ],
      },
    ],
  },
];

export function demoDocumentsAsAiPayload() {
  return demoAssessmentDocuments.map((doc) => ({
    name: doc.name,
    mimeType: "text/plain",
    content: doc.sections
      .map((s) => `${s.title}\n${s.body.join("\n")}`)
      .join("\n\n"),
  }));
}
