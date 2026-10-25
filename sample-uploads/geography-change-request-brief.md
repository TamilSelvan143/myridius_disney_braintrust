# Risk assessment request — new geography (mobile cross-border transfers)

**Document ID:** RA-GEO-2026-014  
**Request owner:** Product — Digital Banking  
**Change type:** New geography  
**Version:** 1.0 · Draft for FCRM review  
**Date:** 26 October 2026  

---

## 1. Purpose and scope

This document supports a **new geography** risk assessment for expanding **outbound retail remittance** from the United States to **Mexico (MX)** and **Nigeria (NG)** via the existing mobile banking application.

The pilot is limited to **existing retail customers** who have been active for at least **90 days** and have **completed KYC** under the current CIP/CDD program. No new customer segment is introduced in phase one.

Transfers will be initiated **exclusively in the mobile app** (non-face-to-face channel). There is no branch or call-center initiation in the pilot.

---

## 2. Geographic change summary

| Item | Current state | Proposed change |
|------|---------------|-----------------|
| Destination countries | US domestic only | Add **Mexico** and **Nigeria** |
| Customer location | US-resident retail | Unchanged |
| Channel | Mobile app | Unchanged |
| Corridors | N/A | **US → MX**, **US → NG** |

**Business rationale:** Serve diaspora and cross-border payment needs for established customers; estimated **4,000–6,500 transfers per month** in Q1 post-launch, average ticket **~USD 1,200**.

---

## 3. Limits and monitoring (transaction-pattern)

- **Daily outbound limit** per customer increases from **USD 5,000** to **USD 25,000** for eligible international transfers.
- **Progressive limits:** New beneficiaries capped at **USD 5,000** per day for the first **60 days**, then standard limits apply (see §2.4 reference in product rules).
- **Velocity controls:** Maximum **10 outbound international transfers per day** per customer during the first 90 days of corridor availability.
- **Sanctions and PEP screening** remain mandatory on every transfer; no waiver for pilot.

---

## 4. Third-party and identity (Mexico and Nigeria)

Remote identity and document verification for step-up events will use **Vera ID** (new vendor relationship for this product line). Vera ID will perform **remote identity and document verification** for high-risk events (new device, new beneficiary, limit increase requests).

The **data processing agreement** with Vera ID is **under legal review** and is **not yet executed**. Operations must not go live until vendor due diligence and contract sign-off are complete.

---

## 5. Compliance and recordkeeping

- **Travel Rule / funds transfer recordkeeping** applies where thresholds are met (FinCEN 31 CFR 1010.410).
- **SAR** and **CTR** processes unchanged; corridor-specific monitoring scenarios will be added to the AML scenario library before launch.
- **Mexico:** Local partner bank settlement via existing correspondent arrangement (reference: Correspondent Banking Addendum 2024-09).
- **Nigeria:** Settlement through approved NGN liquidity provider; FX sourced at execution time.

---

## 6. Risks acknowledged by requester

1. **Geographic risk** — Two new cross-border corridors without prior transaction behaviour in this product.
2. **Third-party risk** — New reliance on Vera ID for verification events; DPA pending.
3. **Product/channel risk** — Mobile-only, non-face-to-face initiation.
4. **Transaction-pattern risk** — Higher daily limits and international velocity.
5. **Customer risk** — Mitigated by existing-customer-only scope and 90-day tenure rule.

---

## 7. Requested decision

Approval to proceed to **pilot launch** subject to FCRM sign-off, completed vendor due diligence, and named monitoring conditions for the first **90 days** in MX and NG corridors.

**Primary contact:** D. Ferreira, Financial Crime Risk Management  
**Product sponsor:** Retail Payments PMO  

---

*This is a sample source document for demo upload testing. Content is fictional and for prototype use only.*
