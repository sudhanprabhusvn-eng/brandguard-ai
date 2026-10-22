import type { ContentVersion, AuditEvent } from '../types';
import {
  SEED_NOVAPULSE_PROFILE,
  SEED_NOVAPULSE_RULES,
  SEED_EVIDENCE_RECORDS
} from '../services/storageService';

export const NOVAPULSE_PROFILE = SEED_NOVAPULSE_PROFILE;
export const INITIAL_BRAND_RULES = SEED_NOVAPULSE_RULES;
export const INITIAL_EVIDENCE_RECORDS = SEED_EVIDENCE_RECORDS;

export const DEMO_TEST_COPY =
  'NovaPulse makes your team 100% more productive! Our platform guarantees results and is completely risk-free. Thousands of companies have already doubled their output.';

export const DEMO_COMPLIANT_COPY =
  'NovaPulse helps teams streamline complex workflows. In our benchmark study of 50 enterprise customers, teams achieved an average 25% reduction in task cycle times. Terms and conditions apply.';

export const INITIAL_DOCUMENTS: ContentVersion[] = [
  {
    id: 'doc-001',
    versionNumber: 'v1.0',
    contentHash: 'e8b3a7f2910c4d8e9a2b5c7f8a1e3d6b0c2e4f6a8b1c3d5e7f9a2b4c6e8f0a1d',
    title: 'Q4 Product Launch Teaser',
    channel: 'Social Media (LinkedIn/X)',
    text: DEMO_TEST_COPY,
    timestamp: '2026-10-22T10:15:00Z',
    author: 'Sarah Jenkins (Creator)',
    isApproved: false,
    findings: [
      {
        id: 'fnd-01',
        ruleId: 'NP-002',
        ruleName: 'Prohibit 100% Risk-Free Claims',
        severity: 'critical',
        category: 'prohibited_language',
        triggerText: 'completely risk-free',
        startIndex: 96,
        endIndex: 116,
        explanation: 'Absolute risk-free marketing claims violate Section 4 of promotional compliance.',
        evidenceStatus: 'na',
        suggestionText: 'designed for enterprise-grade operational resilience'
      },
      {
        id: 'fnd-02',
        ruleId: 'NP-001',
        ruleName: 'Prohibit Guaranteed Results',
        severity: 'critical',
        category: 'prohibited_language',
        triggerText: 'guarantees results',
        startIndex: 62,
        endIndex: 80,
        explanation: 'Performance guarantees are prohibited without prior legal department substantiation.',
        evidenceStatus: 'unverified',
        suggestionText: 'is engineered to deliver measurable outcomes'
      },
      {
        id: 'fnd-03',
        ruleId: 'NP-003',
        ruleName: 'Factual Performance Claims Substantiation',
        severity: 'warning',
        category: 'factual_claim',
        triggerText: '100% more productive',
        startIndex: 26,
        endIndex: 46,
        explanation: 'Metric claim of "100% more productive" has no matching evidence record. Active benchmark supports max 25%.',
        evidenceStatus: 'unverified',
        suggestionText: 'streamlines workflows and accelerates cycle times'
      },
      {
        id: 'fnd-04',
        ruleId: 'NP-003',
        ruleName: 'Factual Performance Claims Substantiation',
        severity: 'warning',
        category: 'factual_claim',
        triggerText: 'doubled their output',
        startIndex: 153,
        endIndex: 172,
        explanation: 'Claim that thousands of companies doubled their output lacks an approved benchmark study.',
        evidenceStatus: 'unverified',
        suggestionText: 'reported significant productivity improvements'
      },
      {
        id: 'fnd-05',
        ruleId: 'NP-004',
        ruleName: 'Mandatory Promotional Disclosure',
        severity: 'warning',
        category: 'required_disclosure',
        triggerText: 'Document Scope',
        startIndex: 0,
        endIndex: 0,
        explanation: 'Promotional performance copy requires mandatory disclaimer: "Terms and conditions apply."',
        evidenceStatus: 'na',
        suggestionText: 'Terms and conditions apply.'
      }
    ]
  }
];

export const INITIAL_AUDIT_LOG: AuditEvent[] = [
  {
    id: 'aud-001',
    timestamp: '2026-10-22T10:15:00Z',
    eventType: 'SUBMITTED',
    documentTitle: 'Q4 Product Launch Teaser',
    contentVersion: 'v1.0',
    contentHash: 'e8b3a7f2910c4d8e9a2b5c7f8a1e3d6b0c2e4f6a8b1c3d5e7f9a2b4c6e8f0a1d',
    ruleVersion: 'v2.1',
    actorName: 'Sarah Jenkins',
    actorRole: 'creator',
    summary: 'Document submitted for initial brand governance evaluation.'
  },
  {
    id: 'aud-002',
    timestamp: '2026-10-22T10:15:02Z',
    eventType: 'SCANNED',
    documentTitle: 'Q4 Product Launch Teaser',
    contentVersion: 'v1.0',
    contentHash: 'e8b3a7f2910c4d8e9a2b5c7f8a1e3d6b0c2e4f6a8b1c3d5e7f9a2b4c6e8f0a1d',
    ruleVersion: 'v2.1',
    actorName: 'BrandGuard Dual-Engine',
    actorRole: 'admin',
    summary: 'Evaluation completed: 2 Critical violations, 3 Warnings identified. Approval gate locked.'
  }
];
