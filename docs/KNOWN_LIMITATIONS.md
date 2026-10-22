# BrandGuard AI — Known Limitations & Architectural Constraints

This document provides a transparent, engineering-level disclosure of the current system boundaries, security limitations, and operational constraints in BrandGuard AI.

---

## 1. Data Storage & Persistence Limitations

### Current Implementation: Browser LocalStorage
- **Storage Scope**: All brand profiles, submitted content records, revisions, approval decisions, and audit events are stored locally in the browser's `localStorage`.
- **Capacity Limits**: Browsers typically limit `localStorage` to approximately 5 MB to 10 MB per origin. Ingesting hundreds of large marketing documents or extensive audit trails may exceed this quota.
- **Device Isolation**: Data created in one browser or computer is not synchronized with other devices or users.
- **Cache Eviction Risk**: Clearing browser cache or site data removes all local records and restores the application to the initial seed state.
- **Production Recommendation**: Transition to a PostgreSQL database with Row-Level Security (RLS) or IndexedDB for client-side offline storage.

---

## 2. Authentication & Authorization Constraints

### Current Implementation: Client-Side Persona Switcher
- **Persona Modes**: `creator`, `compliance_officer`, `admin`.
- **Enforcement Scope**: Permission gates (e.g., preventing creators from approving releases, requiring compliance officers to document exception overrules) are enforced within React state and JavaScript client logic.
- **Security Reality**: There is no backend server verifying cryptographically signed JSON Web Tokens (JWT) or session cookies. A technically proficient user can alter client state using browser developer tools.
- **Production Recommendation**: Implement an authentication provider (e.g., Supabase Auth, Auth0, or Firebase Auth) with server-side validation on all state mutation endpoints.

---

## 3. Cryptographic Audit Trail Guarantees

### What Is Guaranteed:
- **Chronological Hash Chaining**: Every `AuditEvent` generates an SHA-256 hash computed over its payload and the preceding entry's hash (`previousHash`).
- **Tamper-Evident Verification**: The built-in cryptographic chain validator detects any retroactive modification, deletion, or reordering of stored events.
- **Injection Mitigation**: Exported CSV and JSON logs neutralize spreadsheet macro injection.

### What Is NOT Guaranteed:
- **WORM / Hardware Immutability**: Because records reside in client `localStorage`, an attacker with physical access to the device could wipe or replace the entire chain.
- **Regulatory Ledger Certification**: The application does not claim SEC Rule 17a-4, HIPAA, or SOC2 Type II compliance in its current standalone client architecture.

---

## 4. AI Contextual Review Constraints

### Provider Dependency:
- Contextual review uses the Google Gemini 2.5 Flash API (gemini-2.5-flash, configurable to other Gemini Flash variants) via the Google Generative Language REST API.
- In environments where an API key is not supplied, the AI service defaults to its documented `unavailable` state.
- Deterministic governance rules (prohibited phrases, regex bounds, evidence status) operate with 100% independence from external AI providers.

### Client-Side Key Exposure:
- Vite bundles environment variables prefixed with `VITE_` directly into client JavaScript.
- In public deployments, users should provide their own temporary API key during testing or use a backend proxy.

---

## 5. Automated Browser Subagent Limitation

- During Phase 11 & Phase 12 testing in the cloud sandbox, the Playwright browser runner encountered an external network download error (`playwright.azureedge.net` 404).
- All UI layouts, responsive CSS, interactive workflows, and engine evaluations were validated through the Vite production build (`dist/`), Oxlint, local preview server (`http://localhost:4173/`), and the 411 automated integration tests.
