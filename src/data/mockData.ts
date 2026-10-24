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
    title: 'NovaPulse Launch Campaign',
    channel: 'Social Post',
    text: DEMO_TEST_COPY,
    timestamp: '2026-10-22T10:24:00Z',
    author: 'You',
    isApproved: false,
    findings: [
      {
        id: 'fnd-01',
        ruleId: 'Rule R-001',
        ruleName: 'Prohibit Guaranteed Results',
        severity: 'critical',
        category: 'prohibited_language',
        triggerText: 'guarantees results',
        startIndex: 62,
        endIndex: 80,
        explanation: 'Guaranteed results claim (Rule R-001). Performance guarantees require formal legal clearance.',
        evidenceStatus: 'unverified',
        suggestionText: 'engineered to deliver measurable outcomes'
      },
      {
        id: 'fnd-02',
        ruleId: 'Rule R-002',
        ruleName: 'Prohibit 100% Risk-Free Claims',
        severity: 'critical',
        category: 'prohibited_language',
        triggerText: 'completely risk-free',
        startIndex: 96,
        endIndex: 116,
        explanation: 'Absolute risk-free marketing claims violate Section 4 of promotional compliance.',
        evidenceStatus: 'na',
        suggestionText: 'designed for enterprise-grade resilience'
      },
      {
        id: 'fnd-03',
        ruleId: 'Rule R-003',
        ruleName: 'Factual Performance Claims Substantiation',
        severity: 'warning',
        category: 'factual_claim',
        triggerText: '100% more productive',
        startIndex: 26,
        endIndex: 46,
        explanation: 'Metric claim lacks registered benchmark study. Supported citation confirms 25%.',
        evidenceStatus: 'unverified',
        suggestionText: 'streamlines workflows and accelerates turnaround'
      }
    ]
  },
  {
    id: 'doc-002',
    versionNumber: 'v1.2',
    contentHash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
    title: 'Product Feature Update',
    channel: 'Website',
    text: 'NovaPulse increases development speed by 85% for all software teams across global operations.',
    timestamp: '2026-10-22T09:48:00Z',
    author: 'You',
    isApproved: false,
    findings: [
      {
        id: 'fnd-04',
        ruleId: 'Rule R-003',
        ruleName: 'Factual Performance Claims Substantiation',
        severity: 'warning',
        category: 'factual_claim',
        triggerText: 'increases development speed by 85%',
        startIndex: 11,
        endIndex: 45,
        explanation: 'Unverified statistic (Rule R-003). Quantitative claim requires published case evidence.',
        evidenceStatus: 'unverified',
        suggestionText: 'accelerates development velocity across software teams'
      }
    ]
  },
  {
    id: 'doc-003',
    versionNumber: 'v1.1',
    contentHash: 'f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2',
    title: 'Email Blast - Offer',
    channel: 'Email',
    text: 'Claim your spot with the world’s best marketing governance automation platform today.',
    timestamp: '2026-10-22T09:46:00Z',
    author: 'You',
    isApproved: false,
    findings: [
      {
        id: 'fnd-05',
        ruleId: 'Rule R-002',
        ruleName: 'Prohibit Unsubstantiated Superlatives',
        severity: 'warning',
        category: 'prohibited_language',
        triggerText: "world's best",
        startIndex: 24,
        endIndex: 36,
        explanation: 'Superlative language (Rule R-002). "World’s best" claim requires external industry accreditation.',
        evidenceStatus: 'unverified',
        suggestionText: 'leading enterprise governance platform'
      }
    ]
  },
  {
    id: 'doc-004',
    versionNumber: 'v1.0',
    contentHash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    title: 'Q3 Social Media Post',
    channel: 'Social Post',
    text: 'Cut compliance review cycles in half without sacrificing editorial brand rigor or legal accuracy.',
    timestamp: '2026-10-21T16:32:00Z',
    author: 'Sarah Jenkins',
    isApproved: false,
    findings: [
      {
        id: 'fnd-06',
        ruleId: 'Rule R-003',
        ruleName: 'Evidence Requirement',
        severity: 'warning',
        category: 'factual_claim',
        triggerText: 'in half',
        startIndex: 32,
        endIndex: 39,
        explanation: 'Evidence needed (Rule R-003). Time reduction metrics require empirical citation.',
        evidenceStatus: 'missing',
        suggestionText: 'significantly reduce compliance review cycles'
      }
    ]
  },
  {
    id: 'doc-005',
    versionNumber: 'v1.0',
    contentHash: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    title: 'Partner Announcement',
    channel: 'Press Release',
    text: 'NovaPulse partners with global agency network to deliver proactive brand protection at scale.',
    timestamp: '2026-10-21T11:17:00Z',
    author: 'External Comms',
    isApproved: true,
    findings: [
      {
        id: 'fnd-07',
        ruleId: 'Rule R-005',
        ruleName: 'Style & Clarity Guidance',
        severity: 'info',
        category: 'brand_voice',
        triggerText: 'at scale',
        startIndex: 78,
        endIndex: 86,
        explanation: 'Minor style suggestion (Rule R-005). Consider concise active wording.',
        evidenceStatus: 'na',
        suggestionText: 'across international operations'
      }
    ]
  }
];

export const INITIAL_AUDIT_LOG: AuditEvent[] = [
  {
    id: 'aud-001',
    timestamp: '2026-10-22T10:24:00Z',
    eventType: 'CONTENT_SUBMITTED',
    documentTitle: 'NovaPulse Launch Campaign',
    contentVersion: 'v1.0',
    contentHash: 'e8b3a7f2910c4d8e9a2b5c7f8a1e3d6b0c2e4f6a8b1c3d5e7f9a2b4c6e8f0a1d',
    ruleVersion: 'v2.1',
    actorName: 'You',
    actorRole: 'creator',
    summary: 'NovaPulse Launch Campaign • v1.0 • by You'
  },
  {
    id: 'aud-002',
    timestamp: '2026-10-22T10:21:00Z',
    eventType: 'GOVERNANCE_EVALUATION_COMPLETED',
    documentTitle: 'NovaPulse Launch Campaign',
    contentVersion: 'v1.0',
    contentHash: 'e8b3a7f2910c4d8e9a2b5c7f8a1e3d6b0c2e4f6a8b1c3d5e7f9a2b4c6e8f0a1d',
    ruleVersion: 'v2.1',
    actorName: 'BrandGuard Dual-Engine',
    actorRole: 'admin',
    summary: '3 findings detected • 1 critical, 2 warnings'
  },
  {
    id: 'aud-003',
    timestamp: '2026-10-22T09:48:00Z',
    eventType: 'REVISION_SAVED',
    documentTitle: 'Product Feature Update',
    contentVersion: 'v1.1',
    contentHash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
    ruleVersion: 'v2.1',
    actorName: 'You',
    actorRole: 'creator',
    summary: 'v1.1 • by You'
  },
  {
    id: 'aud-004',
    timestamp: '2026-10-22T09:46:00Z',
    eventType: 'APPROVAL_REQUESTED',
    documentTitle: 'Email Blast - Offer',
    contentVersion: 'v1.1',
    contentHash: 'f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2',
    ruleVersion: 'v2.1',
    actorName: 'You',
    actorRole: 'creator',
    summary: 'v1.1 • by You'
  },
  {
    id: 'aud-005',
    timestamp: '2026-10-21T16:32:00Z',
    eventType: 'APPROVAL_GRANTED',
    documentTitle: 'Q3 Social Media Post',
    contentVersion: 'v1.0',
    contentHash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    ruleVersion: 'v2.1',
    actorName: 'Lead Approver',
    actorRole: 'approver',
    summary: 'v1.0 • by Lead Approver'
  },
  {
    id: 'aud-006',
    timestamp: '2026-10-21T11:17:00Z',
    eventType: 'BRAND_RULES_UPDATED',
    documentTitle: 'Brand Policy Baseline',
    contentVersion: 'v2.1',
    contentHash: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    ruleVersion: 'v2.1',
    actorName: 'Brand Manager',
    actorRole: 'brand_manager',
    summary: 'NovaPulse • 5 active rules'
  }
];
