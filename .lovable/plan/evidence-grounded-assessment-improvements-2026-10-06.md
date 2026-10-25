# Evidence-grounded assessment improvements

## Goal
Make every risk conclusion explainable, distinguish AI output from rules-engine calculations and human decisions, and remove prototype-only inconsistencies.

## Changes
- Rename the product to **Risk Assessment Workbench** across navigation and page metadata.
- Replace headline-only risk presentation with an overall rating supported by named factor findings and published-rule citations.
- Make the assessment chain explicit for every factor: inherent score → named controls and effectiveness → deterministic residual score, with a non-zero floor.
- Add clear provenance labels and confidence values to extracted facts, calculations, analyst actions, and audit events.
- Calculate dashboard and sidebar workload numbers from the assessment records instead of fixed copy.
- Represent the demo’s change requests, taxonomy, policy sources, and decision ledger as structured datasets used by the visible views.
- Keep the current multiple-file upload and pageless, downloadable document viewer behavior intact.

## Technical details
- Extend the existing typed assessment and finding records rather than adding a backend.
- Use a numeric residual formula (`inherent × (1 − control effectiveness)`, minimum score 1) and derive rating bands from its output.
- Update the existing route metadata to match the new product name.
- Verify the dashboard, an analyst-review detail, the evidence viewer, and mobile-width rendering in the live preview.

## Scope
This remains a frontend prototype. The governed data layer will be structured demo data in code; persistent storage and real AI document analysis are not included.
