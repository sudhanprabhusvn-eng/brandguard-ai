# BrandGuard AI — Enterprise Brand Governance & Conformance Engine

BrandGuard AI is a client-side enterprise brand governance and compliance engine that enforces marketing guidelines, claim substantiation, prohibited phrases, and regulatory disclaimers through deterministic evaluation, optional AI contextual analysis, immutable version lineage, human approval workflows, and cryptographic audit hashing.

---

## Phase 12 Handover Documentation Index
- 📘 [Demonstration Guide](docs/DEMO_GUIDE.md) — Step-by-step repeatable walkthrough using NovaPulse AI.
- 🧪 [Test & Verification Report](docs/TEST_REPORT.md) — 411 automated checks, regression results, and linter reports.
- 🚀 [Deployment & Hosting Guide](docs/DEPLOYMENT.md) — Free-tier setup for Vercel, Netlify, Cloudflare Pages, and rollback procedures.
- ⚠️ [Known Limitations & Architecture Constraints](docs/KNOWN_LIMITATIONS.md) — Disclosures regarding browser storage, persona roles, and cryptographic guarantees.
- ⚙️ [.env.example](.env.example) — Safe configuration template without real credentials.

---

## 1. System Architecture & Tech Stack

### Technology Stack
- **Frontend Framework**: React 19.3.1 (with TypeScript 6.0.3)
- **Build Tool & Bundler**: Vite 8.3.5
- **Icons**: Lucide React 1.61.0
- **Linter**: Oxlint 1.88.0 (zero warnings, zero errors)
- **Backend**: None (pure client-side SPA architecture running in the browser)
- **Persistence Layer**: Browser `localStorage` with fallback in-memory state, initialized via `storageService.ts`
- **AI Integration**: Google Gemini 1.5 Flash via the Google Generative Language REST API (optional, strictly non-blocking)

### Application Directory Structure
```
CODE AXIS/
├── public/                 # Static public assets
├── src/
│   ├── assets/             # Brand logos and iconography
│   ├── components/         # Reusable design system components
│   │   ├── brand/          # Brand profile modals and rule editors
│   │   ├── common/         # Buttons, inputs, modals, cards, badges
│   │   └── navigation/     # Sidebar and header navigation
│   ├── data/               # Seed data (NovaPulse brand profile, guidelines)
│   ├── pages/              # 7 Primary Application Views
│   │   ├── DashboardPage.tsx       # Real-time metrics & recent activity
│   │   ├── BrandDnaPage.tsx        # Brand profiles, tone, & rule governance
│   │   ├── NewReviewPage.tsx       # Content submission & ingestion
│   │   ├── AnalysisResultsPage.tsx # Deterministic & AI findings viewer
│   │   ├── FixComparePage.tsx      # Word-level diff studio & revision creator
│   │   ├── ApprovalQueuePage.tsx   # Human approval state machine gate
│   │   └── AuditReportsPage.tsx    # Cryptographic audit logs & analytics
│   ├── services/           # Core Domain Services
│   │   ├── aiContextualService.ts  # Dual-engine AI reviewer & fallback
│   │   ├── approvalService.ts      # Human approval workflow & transitions
│   │   ├── auditService.ts         # Audit events, metrics & SHA-256 chain
│   │   ├── contentService.ts       # Content documents, revisions, SHA-256
│   │   ├── governanceEngine.ts     # Deterministic rule engine & evidence
│   │   └── storageService.ts       # LocalStorage persistence & seed data
│   ├── types/              # Domain TypeScript interfaces
│   ├── utils/              # Word diff algorithms, crypto helpers
│   ├── App.tsx             # Root component, router & role switcher
│   ├── index.css           # Editorial Design System tokens & styles
│   └── main.tsx            # React entry point
└── test/                   # Automated Integration & Regression Suites
    ├── phase4_verification.mjs     # Ingestion & boundary tests
    ├── phase5_verification.mjs     # Profiles & evidence tests
    ├── phase6_verification.mjs     # Deterministic rule engine tests
    ├── phase7_verification.mjs     # AI contextual review tests
    ├── phase8_verification.mjs     # Fix & compare diff tests
    ├── phase9_verification.mjs     # Approval queue & transition tests
    ├── phase10_verification.mjs    # Audit log & hash chain tests
    ├── phase11_verification.mjs    # End-to-end integration & QA tests
    └── run_all_tests.mjs           # Master test runner (411 assertions)
```

---

## 2. Core Data Entities & Cross-Phase Integrity

| Entity | Primary Identifier | Immutability / Lineage Guarantee |
| :--- | :--- | :--- |
| **Brand Profile** | `brandId` (e.g., `brand-novapulse`) | Tracks `version` (e.g., `v1.2`). Rules have stable IDs (e.g., `NP-001`). |
| **Content Document** | `contentId` (e.g., `doc_1729600000000_abc`) | Stable root identifier across all revisions. |
| **Content Version** | `versionId` (e.g., `ver_1729600000000_xyz`) | Strictly immutable. Version numbers increment (`v1.0` -> `v1.1` -> `v1.2`). Computes SHA-256 `contentHash`. |
| **Evaluation Run** | `evaluationId` | Bound to exact `contentVersionId` and `ruleVersionRef`. Retains findings even after revisions. |
| **Approval Decision** | `decisionId` | Bound to exact `contentVersionId` and `contentHash`. Revisions do NOT inherit approval. |
| **Audit Event** | `id` + SHA-256 `hash` | Linked cryptographically to `previousHash` in a tamper-evident blockchain-like chain. |

---

## 3. Core End-to-End User Journey (NovaPulse AI)

The verified reference workflow follows a 6-step lifecycle:

```
[1. Content Submission]
        │
        ▼
[2. Deterministic Analysis] ──(Optional AI Contextual Review)──┐
        │                                                     │
        ▼                                                     │
[3. Findings Viewer] ◄────────────────────────────────────────┘
        │
        ▼
[4. Fix & Compare Studio] ──► [Creates Immutable Revision (v1.1)]
        │
        ▼
[5. Human Approval Gate] ──► [Compliance Officer Sign-Off]
        │
        ▼
[6. Cryptographic Audit Trail & CSV/JSON Export]
```

1. **Brand Setup & Rules**: Inspect saved governance rules for **NovaPulse AI** (e.g., `NP-001` prohibiting absolute outcome guarantees, `NP-002` prohibiting risk-free claims, `NP-003` requiring statistical evidence, `NP-004` requiring terms disclosures).
2. **Content Submission**: Ingest marketing copy with boundary validation (minimum 3-char title, non-empty text, sanitized inputs). Mints root version `v1.0` and SHA-256 fingerprint.
3. **Deterministic Evaluation**: Rules fire with zero network dependency. Prohibited terms trigger `CRITICAL` violations. Missing evidence triggers `UNVERIFIED` status without falsely claiming the statement is factually false.
4. **AI Contextual Review**: Runs concurrently if Gemini API key is configured. If unconfigured or timed out, marks status as `unavailable` without blocking the deterministic analysis or breaking the workflow.
5. **Correction & Comparison**: In Fix & Compare Studio, editor adjusts text. Original `v1.0` is immutable; revision is saved as `v1.1` with a new SHA-256 hash. Real-time word diff highlights additions and removals.
6. **Human Approval**: Only designated compliance officers can approve. Any version with unaddressed `CRITICAL` findings is blocked unless an explicit `Exception Overrule` rationale is documented. New revisions reset to `DRAFT` and never inherit prior approval.
7. **Audit & Reporting**: Every action logs an immutable event with SHA-256 hash chaining. Metrics calculate exact submission, revision, and approval counts without duplicate inflation.

---

## 4. Evidence-Status Semantics

BrandGuard AI strictly differentiates between falsity, missing evidence, and unverified claims:
- **`verified`**: The empirical claim is backed by a registered substantiation document in the brand's evidence library.
- **`unverified`**: The empirical claim lacks substantiation in the local library. The engine flags this as a compliance warning requiring citation, **not** as proof of falsehood.
- **`exempt`**: Internal communication or non-public copy exempted by compliance rules.
- **`disputed`**: Explicit contradiction found against verified benchmarks.

---

## 5. Security & Threat Hardening

### Addressed in Phase 11:
1. **CSV Formula Injection (Spreadsheet Macro Mitigation)**:
   - All exported CSV fields are passed through `escapeCsvField()`.
   - Any string starting with `=`, `+`, `-`, or `@` is prepended with a single quote (`'`) to neutralize Excel/Google Sheets formula execution.
2. **XSS & HTML Injection Prevention**:
   - User-submitted copy is stored as raw string data and rendered via standard React JSX escaping (no `dangerouslySetInnerHTML`).
3. **Tamper-Evident Audit Chain**:
   - Every `AuditEvent` generates an SHA-256 hash of its payload combined with the preceding event's hash (`previousHash`).
   - The UI includes an interactive cryptographic verification tool to validate chain continuity.
4. **API Key Security**:
   - No hardcoded API keys exist in the repository or git history.
   - The API key is entered by the user and kept in sessionStorage for the current tab only. Browser-side keys remain visible to the user and are not a production secret-management solution.

### Disclosed Architecture & Security Limitations:
- **Client-Side Storage**: Persistence is based on browser `localStorage`. A malicious user with physical access or local developer tools can clear or alter local records.
- **Role Switching**: The persona switcher (`creator`, `compliance_officer`, `admin`) is client-side for evaluation and workflow demonstration. In a production multi-tenant deployment, authorization must be validated server-side with JWT or session cookies.
- **Single-Tenant Scope**: All records are scoped by `brandId` in memory, but cross-user isolation requires a backend database with row-level security (RLS).

---

## 6. Local Setup, Testing & Build Instructions

### Prerequisites
- Node.js (version 18.0.0 or higher recommended)
- npm (version 9.0.0 or higher)

### Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```

### Running Automated Test Suites
Run the comprehensive test runner covering all 8 phases (411 assertions):
```bash
npm test
```
To run a specific test suite directly:
```bash
node test/phase11_verification.mjs
```

### Code Quality & Linting
Run Oxlint across all 37 TypeScript and TSX source files:
```bash
npm run lint
```

### Production Build
Compile TypeScript and bundle client assets with Vite:
```bash
npm run build
```
Production assets will be output to the `dist/` directory.

### Local Development Server
Start the interactive development server:
```bash
npm run dev
```
Open `http://localhost:5173` in any modern web browser.

---

## 7. Deployment Readiness (Free-Tier Compatible)

Because BrandGuard AI is an optimized client-side Single Page Application (SPA) requiring zero paid cloud servers or databases, it can be deployed for free on any standard static hosting platform:

### Recommended Free Deployment Targets:
1. **Vercel**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
2. **Netlify**:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. **GitHub Pages**:
   - Deploy `dist/` folder via GitHub Actions workflow.
4. **Cloudflare Pages**:
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Environment Configuration:
- No VITE-prefixed API key is supported. Enter a personal test key in AI Settings; it is held in the current tab session. For a shared public deployment, implement a server-side proxy and store the key in server-side secrets.

---

## 8. Backup & Data Restore

- **Exporting Data**: In the **Audit & Reports** screen, click **Export Audit CSV** or **Export Compliance JSON** to download complete records of all submissions, decisions, and cryptographic logs.
- **Resetting Seed Data**: If local browser storage becomes corrupted or inconsistent, clearing browser application storage for the origin restores the pristine seed state for **NovaPulse AI**.
