# BrandGuard AI — End-to-End Demonstration Guide

This guide provides a structured, repeatable demonstration script for stakeholders and evaluators to experience BrandGuard AI's governance capabilities using the **NovaPulse AI** sample brand.

---

## Prerequisites
- Node.js 18+ and npm installed.
- Application running locally via `npm run dev` (`http://localhost:5173/`).
- Persona switcher located in the top navigation bar.

---

## Demo Script: The Complete Governance Journey

### Step 1: Inspect Brand Governance Rules (Brand DNA)
1. Navigate to **Brand DNA** in the left sidebar.
2. Ensure **NovaPulse AI** is the active brand.
3. Review the active governance rules:
   - `NP-001`: Absolute outcome guarantees prohibited (`CRITICAL`).
   - `NP-002`: Risk-free / zero-downside claims prohibited (`CRITICAL`).
   - `NP-003`: Statistical or efficiency claims require empirical benchmark citation (`WARNING`).
   - `NP-004`: Terms & conditions disclosure required on performance claims (`WARNING`).
4. Note that rules have stable IDs and versions, and changes persist across page refreshes.

### Step 2: Content Ingestion & Boundary Validation (New Review)
1. Set the role switcher in the top bar to **Creator**.
2. Navigate to **New Review**.
3. Enter document title: `NovaPulse Enterprise Launch Campaign`
4. Select Channel / Format: `Social Post`
5. Paste the test copy:
   > *"NovaPulse makes your team 100% more productive! Our platform guarantees results and is completely risk-free. Thousands of companies have already doubled their output."*
6. Click **Submit for Governance Review**.
7. **Expected Result**: 
   - Root document is created with immutable version `v1.0`.
   - A unique SHA-256 fingerprint is calculated for the exact text.
   - The user is automatically routed to the **Analysis Results** view.

### Step 3: Deterministic & Dual-Engine Analysis (Analysis Results)
1. Observe the deterministic governance findings:
   - **Critical Violation**: Phrase `"guarantees results"` matches prohibited rule `NP-001`.
   - **Critical Violation**: Phrase `"completely risk-free"` matches prohibited rule `NP-002`.
   - **Unverified Claim**: `"100% more productive"` and `"doubled their output"` flagged under rule `NP-003` as lacking registered benchmark evidence. Note that this is marked as `UNVERIFIED`, **not** falsely labeled as factually false.
   - **Disclosure Missing**: Rule `NP-004` requires a terms disclosure.
2. Observe the AI Contextual Review card:
   - If `VITE_GEMINI_API_KEY` is not configured, the card displays a clean **Unavailable** state, noting that deterministic rules continue to protect brand integrity.
   - If AI simulation is toggled to Offline using the topbar indicator, the application demonstrates zero disruption to deterministic evaluation.

### Step 4: Fix & Compare Studio (Fix and Compare)
1. Click **Fix & Compare Studio** (or navigate via sidebar).
2. The left pane shows the original text (`v1.0`), which is strictly read-only and immutable.
3. In the right editor pane, replace the non-compliant text with:
   > *"NovaPulse helps enterprise teams streamline complex workflows. In our benchmark study of 50 enterprise customers, teams achieved an average 25% reduction in task cycle times. Terms and conditions apply."*
4. Enter revision notes: `Replaced absolute guarantees with verified benchmark study metrics.`
5. Click **Save as New Revision (v1.1) & Recheck**.
6. **Expected Result**:
   - Version `v1.0` remains intact and unchanged.
   - Version `v1.1` is minted with a new SHA-256 hash.
   - Word-level diff visualizer displays green highlights for additions and strikethrough red highlights for removals.
   - Real-time re-evaluation of `v1.1` evaluates to **PASS** with 0 critical violations.

### Step 5: Human Approval Gate (Approval Queue)
1. Navigate to **Approval Queue**.
2. **Test 1: Attempt Approval on Non-Compliant v1.0**:
   - Switch persona to **Compliance Officer**.
   - Select version `v1.0`.
   - Attempt to click **Approve Release**.
   - Notice that standard approval is blocked because critical violations exist.
   - Documented exception overrule justification is required to override.
3. **Test 2: Approve Compliant v1.1**:
   - Select version `v1.1`.
   - Click **Submit for Review** (if in DRAFT status).
   - As Compliance Officer, click **Approve Release**.
   - Add approval note: `All critical claims resolved with study citations.`
   - Confirm approval. Status transitions to **APPROVED**.
4. **Test 3: Non-Inheritance on Subsequent Revisions**:
   - Go back to Fix & Compare and draft revision `v1.2` (e.g. adding a seasonal sign-off).
   - Return to Approval Queue: version `v1.2` initializes in **DRAFT** status, demonstrating that approvals are strictly version-specific and never inherited.

### Step 6: Cryptographic Audit Trail & Reporting (Audit & Reports)
1. Navigate to **Audit & Reports**.
2. View the chronological log of every action:
   - `CONTENT_SUBMITTED`
   - `GOVERNANCE_EVALUATION_COMPLETED`
   - `REVISION_SAVED`
   - `APPROVAL_GRANTED`
3. Click **Verify Cryptographic Chain**:
   - Verifies SHA-256 hash chaining across all audit events. Confirms no logs were altered or inserted out of order.
4. Click **Export Audit CSV**:
   - Download the CSV log.
   - Open in a text editor to verify that formula injection characters (`=`, `+`, `-`, `@`) are safely escaped with a single quote (`'`).

### Step 7: Safe Demo Reset
1. Navigate to **Brand DNA**.
2. Scroll to the bottom of the rules list.
3. Click **Reset to Demonstration Baseline**.
4. Confirm the prompt modal.
5. Storage for NovaPulse is restored to the pristine demonstration baseline without breaking any application features.
