import type { BrandProfile, BrandRule, EvidenceRecord } from '../types';

export const STORAGE_DISCLOSURE =
  'Interim Local Browser Storage (localStorage). Client-side prototype persistence without remote database.';

const PROFILES_STORAGE_KEY = 'brandguard_brand_profiles_v1';
const ACTIVE_PROFILE_KEY = 'brandguard_active_profile_id';

export const SEED_EVIDENCE_RECORDS: EvidenceRecord[] = [
  {
    id: 'EVD-NP-01',
    claim: 'Benchmark of 50 enterprise beta customers demonstrated an average 25% reduction in task cycle times.',
    sourceCitation: 'NovaPulse Engineering & Operations Study, Q3 2026. Dataset NP-BETA-Q3-01.',
    dateAdded: '2026-09-15',
    expirationDate: '2027-09-15',
    verified: true
  },
  {
    id: 'EVD-NP-02',
    claim: 'NovaPulse Cloud achieved 99.99% core service availability across enterprise zones.',
    sourceCitation: 'Independent Infrastructure Audit Report, CloudAudit LLP, August 2026.',
    dateAdded: '2026-08-30',
    expirationDate: '2027-08-30',
    verified: true
  }
];

export const SEED_NOVAPULSE_RULES: BrandRule[] = [
  {
    id: 'NP-001',
    name: 'Prohibit Guaranteed Results',
    description: 'Do not use "guaranteed results" or "guarantees results" without approved legal substantiation.',
    category: 'prohibited_language',
    severity: 'critical',
    pattern: 'guarantee[sd]?\\s+results?',
    engine: 'deterministic',
    active: true,
    explanation: 'Absolute outcome guarantees create severe regulatory liability under consumer protection standards.',
    suggestedReplacement: 'is engineered to deliver measurable outcomes',
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-10-15T14:30:00Z',
    modifiedBy: 'Brand Manager'
  },
  {
    id: 'NP-002',
    name: 'Prohibit 100% Risk-Free Claims',
    description: 'Do not use "100% risk-free", "completely risk-free", or absolute risk-free marketing claims.',
    category: 'prohibited_language',
    severity: 'critical',
    pattern: '(100%|completely|totally|entirely)?\\s*risk[- ]free',
    engine: 'deterministic',
    active: true,
    explanation: 'No enterprise software deployment can guarantee zero operational risk without qualification.',
    suggestedReplacement: 'designed for enterprise-grade operational resilience',
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-10-15T14:30:00Z',
    modifiedBy: 'Brand Manager'
  },
  {
    id: 'NP-003',
    name: 'Factual Performance Claims Substantiation',
    description: 'Empirical performance claims (e.g. percentages, output multipliers) must cite an approved evidence record.',
    category: 'factual_claim',
    severity: 'warning',
    pattern: '(\\d+%(?:\\s+more|\\s+less)?|doubled?\\s+(?:their\\s+)?output)',
    engine: 'ai_contextual',
    active: true,
    explanation: 'Empirical claim lacks verified benchmark evidence in the active NovaPulse evidence library.',
    suggestedReplacement: 'achieved an average 25% cycle time reduction in verified benchmark tests',
    evidenceReferenceId: 'EVD-NP-01',
    createdAt: '2026-09-05T11:00:00Z',
    updatedAt: '2026-10-15T14:30:00Z',
    modifiedBy: 'Brand Manager'
  },
  {
    id: 'NP-004',
    name: 'Mandatory Promotional Disclosure',
    description: 'Promotional offers and performance statements must include "Terms and conditions apply."',
    category: 'required_disclosure',
    severity: 'warning',
    pattern: 'terms\\s+and\\s+conditions\\s+apply',
    engine: 'deterministic',
    active: true,
    explanation: 'Promotional performance statements require prominent display of the standard terms disclaimer.',
    suggestedReplacement: 'Terms and conditions apply.',
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-10-15T14:30:00Z',
    modifiedBy: 'Brand Manager'
  },
  {
    id: 'NP-005',
    name: 'Direct and Objective Tone',
    description: 'Prefer clear, direct, professional language; avoid sensationalist punctuation and empty superlatives.',
    category: 'tone',
    severity: 'info',
    pattern: '!{2,}|unbelievable|miraculous',
    engine: 'ai_contextual',
    active: true,
    explanation: 'Sensational punctuation or superlative framing undermines technical credibility.',
    suggestedReplacement: 'delivers dependable workflow improvements',
    createdAt: '2026-09-12T16:00:00Z',
    updatedAt: '2026-10-15T14:30:00Z',
    modifiedBy: 'Brand Manager'
  }
];

export const SEED_NOVAPULSE_PROFILE: BrandProfile = {
  id: 'np-org-01',
  name: 'NovaPulse',
  version: 'v2.1',
  description: 'Enterprise intelligence platform for agile team operations and automated workflow orchestration.',
  industry: 'B2B SaaS / Enterprise Automation',
  voiceGuidelines: [
    'Objective, direct and transparent communication style.',
    'Clear value metrics backed strictly by published benchmarks.',
    'Avoid unsubstantiated marketing hyperbole and absolute guarantees.',
    'Promotional copy must include mandatory terms & disclosures.'
  ],
  requiredPhrases: [
    'Terms and conditions apply.',
    'NovaPulse Platform'
  ],
  prohibitedPhrases: [
    'guaranteed results',
    'guarantees results',
    '100% risk-free',
    'completely risk-free'
  ],
  disclosures: [
    'Terms and conditions apply to all promotional benchmark offers.',
    'Case studies represent enterprise beta environments and results may vary.'
  ],
  visualGuidelines: [
    'Use Deep Teal and Warm Sand for primary editorial canvas.',
    'Preserve high contrast (minimum 7:1 for text surfaces).',
    'Avoid saturated neon backgrounds.'
  ],
  rules: SEED_NOVAPULSE_RULES,
  evidenceRecords: SEED_EVIDENCE_RECORDS,
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-10-22T10:15:00Z',
  isDemonstration: true,
  versionHistory: [
    {
      version: 'v2.0',
      timestamp: '2026-09-15T10:00:00Z',
      modifiedBy: 'Brand Director',
      summary: 'Initial baseline brand governance policies and disclosure definitions.',
      ruleCount: 4
    },
    {
      version: 'v2.1',
      timestamp: '2026-10-15T14:30:00Z',
      modifiedBy: 'Brand Manager',
      summary: 'Added NP-005 Direct and Objective Tone guideline and attached EVD-NP-01 citation.',
      ruleCount: 5
    }
  ]
};

export const storageService = {
  /**
   * Load all brand profiles from browser localStorage with safe fallback to seed.
   */
  loadBrandProfiles(): BrandProfile[] {
    try {
      const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (!raw) {
        this.saveBrandProfiles([SEED_NOVAPULSE_PROFILE]);
        return [SEED_NOVAPULSE_PROFILE];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.saveBrandProfiles([SEED_NOVAPULSE_PROFILE]);
        return [SEED_NOVAPULSE_PROFILE];
      }
      return parsed;
    } catch {
      return [SEED_NOVAPULSE_PROFILE];
    }
  },

  /**
   * Persist brand profiles array to localStorage.
   */
  saveBrandProfiles(profiles: BrandProfile[]): boolean {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get active profile ID or default to NovaPulse.
   */
  getActiveProfileId(): string {
    try {
      const id = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (id) return id;
    } catch {
      // Ignore
    }
    return SEED_NOVAPULSE_PROFILE.id;
  },

  /**
   * Set active profile ID in storage.
   */
  setActiveProfileId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    } catch {
      // Ignore
    }
  },

  /**
   * Bump minor version (e.g. "v2.1" -> "v2.2") or major ("v3.0").
   */
  bumpVersion(currentVersion: string, isMajor: boolean = false): string {
    const match = currentVersion.match(/^v?(\d+)\.(\d+)$/);
    if (!match) return 'v2.2';
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (isMajor) {
      return `v${major + 1}.0`;
    }
    return `v${major}.${minor + 1}`;
  },

  /**
   * Validate a rule before adding or saving.
   * Ensures non-empty fields, valid regex pattern, and unique rule ID.
   */
  validateRule(
    rule: Partial<BrandRule>,
    existingRules: BrandRule[],
    isEditing: boolean = false
  ): { valid: boolean; error?: string } {
    if (!rule.id || !rule.id.trim()) {
      return { valid: false, error: 'Rule ID is required (e.g. NP-006).' };
    }

    const trimmedId = rule.id.trim().toUpperCase();

    // Check duplicate ID
    if (!isEditing) {
      const duplicate = existingRules.some((r) => r.id.toUpperCase() === trimmedId);
      if (duplicate) {
        return { valid: false, error: `Rule ID "${trimmedId}" already exists. Rule IDs must be unique.` };
      }
    }

    if (!rule.name || !rule.name.trim()) {
      return { valid: false, error: 'Rule name is required.' };
    }

    if (!rule.description || !rule.description.trim()) {
      return { valid: false, error: 'Rule description is required.' };
    }

    if (!rule.pattern || !rule.pattern.trim()) {
      return { valid: false, error: 'Rule pattern/regex is required.' };
    }

    // Safe regex validation - do not execute arbitrary code
    try {
      new RegExp(rule.pattern, 'i');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid regular expression syntax';
      return { valid: false, error: `Pattern syntax error: ${msg}` };
    }

    return { valid: true };
  },

  /**
   * Reset storage back to clean NovaPulse demonstration baseline.
   */
  resetToDefaultSeed(): BrandProfile[] {
    const seed = [SEED_NOVAPULSE_PROFILE];
    this.saveBrandProfiles(seed);
    this.setActiveProfileId(SEED_NOVAPULSE_PROFILE.id);
    return seed;
  }
};
