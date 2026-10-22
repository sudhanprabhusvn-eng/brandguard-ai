export type PersonaRole = 'creator' | 'brand_manager' | 'approver' | 'admin';

export type PageId =
  | 'dashboard'
  | 'brand_dna'
  | 'new_review'
  | 'results'
  | 'fix_compare'
  | 'approvals'
  | 'audit';

export type Severity = 'critical' | 'warning' | 'info';

export type RuleCategory =
  | 'prohibited_language'
  | 'factual_claim'
  | 'required_disclosure'
  | 'tone'
  | 'brand_voice';

export type EngineTarget = 'deterministic' | 'ai_contextual';

export type RuleMatchMode = 'case_insensitive' | 'exact' | 'whole_word';

export type RuleType =
  | 'prohibited_phrase'
  | 'required_disclosure'
  | 'unsupported_claim'
  | 'direct_tone'
  | 'unsupported';

export type FindingStatus = 'FAIL' | 'REVIEW_REQUIRED' | 'PASS' | 'NOT_EVALUATED';

export type EngineType = 'deterministic' | 'contextual_review_flag' | 'unsupported';

export type EvidenceStatus =
  | 'verified'
  | 'unverified'
  | 'contradicted'
  | 'na'
  | 'missing'
  | 'approved';

export type EvaluationOverallStatus = 'FAIL' | 'REVIEW_REQUIRED' | 'PASS' | 'NOT_EVALUATED';

export interface BrandRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: Severity;
  pattern: string;
  caseSensitive?: boolean;
  matchMode?: RuleMatchMode;
  ruleType?: RuleType;
  applicabilityCondition?: string;
  engine: EngineTarget;
  active: boolean;
  explanation: string;
  scope?: string;
  evidenceReferenceId?: string;
  suggestedReplacement?: string;
  createdAt: string;
  updatedAt: string;
  modifiedBy?: string;
}

export interface EvidenceRecord {
  id: string;
  claim: string;
  sourceCitation: string;
  dateAdded: string;
  expirationDate: string;
  verified: boolean;
}

export interface RuleVersionEntry {
  version: string;
  timestamp: string;
  modifiedBy: string;
  summary: string;
  ruleCount: number;
}

export interface BrandProfile {
  id: string;
  name: string;
  version: string;
  description: string;
  industry?: string;
  voiceGuidelines: string[];
  requiredPhrases: string[];
  prohibitedPhrases: string[];
  disclosures: string[];
  visualGuidelines?: string[];
  rules: BrandRule[];
  evidenceRecords: EvidenceRecord[];
  createdAt: string;
  updatedAt: string;
  versionHistory: RuleVersionEntry[];
  isDemonstration?: boolean;
}

export type FindingSource = 'DETERMINISTIC' | 'AI_CONTEXTUAL';

export type AiFindingCategory =
  | 'contextual_claim'
  | 'brand_voice'
  | 'clarity_directness'
  | 'evidence_aware'
  | 'rule_contextual';

export type AiProviderStatus = 'available' | 'unconfigured' | 'error' | 'loading' | 'disabled';

export interface AiProviderConfig {
  providerId: 'gemini_free' | 'custom_endpoint' | 'none';
  apiKey?: string;
  modelName: string;
  endpointUrl?: string;
  isEnabled: boolean;
  temperature?: number;
}

export interface Finding {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  category: RuleCategory;
  triggerText: string;
  startIndex: number;
  endIndex: number;
  explanation: string;
  evidenceStatus: EvidenceStatus;
  evidenceId?: string;
  suggestionText?: string;
  // Phase 6 deterministic engine properties:
  ruleVersion?: string;
  ruleType?: RuleType;
  status?: FindingStatus;
  engineType?: EngineType;
  brandProfileId?: string;
  contentId?: string;
  contentVersionId?: string;
  suggestedAction?: string;
  evaluationTimestamp?: string;
  // Phase 7 AI Contextual properties:
  source?: FindingSource;
  aiCategory?: AiFindingCategory;
  reasoningSummary?: string;
  isUnlocatableQuote?: boolean;
  providerId?: string;
  modelName?: string;
  runId?: string;
}

export interface AiReviewResult {
  runId: string;
  contentId: string;
  contentVersion: string;
  contentHash: string;
  brandProfileId: string;
  ruleVersionRef: string;
  providerId: string;
  modelName: string;
  executedAt: string;
  status: 'completed' | 'failed' | 'unavailable';
  errorMessage?: string;
  findings: Finding[];
  analysisSummary: string;
}

export interface EvaluationSummary {
  totalRulesEvaluated: number;
  passedCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  reviewRequiredCount: number;
  overallStatus: EvaluationOverallStatus;
  overallExplanation: string;
}

export interface ContentEvaluationResult {
  id: string;
  contentId: string;
  contentTitle: string;
  contentVersion: string;
  contentHash: string;
  brandProfileId: string;
  brandProfileName: string;
  ruleVersionRef: string;
  evaluatedAt: string;
  engineVersion: string;
  overallStatus: EvaluationOverallStatus;
  summary: EvaluationSummary;
  findings: Finding[];
}

export type ContentType =
  | 'social_post'
  | 'ad_copy'
  | 'product_email'
  | 'landing_page'
  | 'general_marketing';

export type SubmissionStatus = 'ingested' | 'pending_analysis' | 'analyzed' | 'archived';

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  encoding: string;
  importedAt: string;
}

export interface ContentVersionRecord {
  versionId: string;
  versionNumber: string;
  contentHash: string;
  rawText: string;
  characterCount: number;
  wordCount: number;
  createdAt: string;
  ruleVersionRef: string;
  changeSummary?: string;
}

export interface SubmittedContent {
  id: string;
  title: string;
  brandProfileId: string;
  brandProfileName: string;
  ruleVersionRef: string;
  contentType: ContentType;
  rawText: string;
  contentHash: string;
  versionId: string;
  versionNumber: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  fileMetadata?: FileMetadata;
  characterCount: number;
  wordCount: number;
  versionHistory: ContentVersionRecord[];
}

export interface IngestionValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

export interface ContentVersion {
  id: string;
  versionNumber: string;
  contentHash: string;
  title: string;
  channel: string;
  text: string;
  timestamp: string;
  author: string;
  findings: Finding[];
  isApproved: boolean;
  approvalRecord?: ApprovalRecord;
  brandProfileId?: string;
  brandProfileName?: string;
  ruleVersionRef?: string;
  contentType?: ContentType;
  submittedContentId?: string;
}

export type WorkflowStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'APPROVED'
  | 'SUPERSEDED';

export type DecisionType = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface ApprovalDecisionRecord {
  id: string;
  brandId: string;
  brandName: string;
  contentId: string;
  contentTitle: string;
  contentVersionId: string;
  versionNumber: string;
  contentHash: string;
  decision: DecisionType;
  reviewerName: string;
  reviewerRole: PersonaRole;
  timestamp: string;
  reason?: string;
  comment?: string;
  isException?: boolean;
  exceptionJustification?: string;
  ruleVersionRef: string;
  evaluationStatus: string;
  blockingFindingsCount: number;
  totalFindingsCount: number;
  parentVersionNumber?: string;
}

export interface ApprovalQueueItem {
  id: string;
  contentId: string;
  contentTitle: string;
  contentType: ContentType;
  brandProfileId: string;
  brandProfileName: string;
  ruleVersionRef: string;
  versionId: string;
  versionNumber: string;
  contentHash: string;
  rawText: string;
  submittedAt: string;
  submitterName: string;
  submitterRole: PersonaRole;
  workflowStatus: WorkflowStatus;
  latestEvaluation?: ContentEvaluationResult;
  isLatestVersion: boolean;
  parentVersionNumber?: string;
  historicalDecisions: ApprovalDecisionRecord[];
}

export interface ApprovalRecord {
  id: string;
  contentVersionId: string;
  contentHash: string;
  ruleVersion: string;
  status: 'approved' | 'rejected' | 'changes_requested';
  reviewerName: string;
  reviewerRole: PersonaRole;
  justification: string;
  timestamp: string;
}

export type AuditEventType =
  | 'CONTENT_SUBMITTED'
  | 'CONTENT_VERSION_CREATED'
  | 'GOVERNANCE_EVALUATION_COMPLETED'
  | 'DETERMINISTIC_FINDINGS_GENERATED'
  | 'AI_REVIEW_COMPLETED'
  | 'REVISION_SAVED'
  | 'SUBMITTED_FOR_REVIEW'
  | 'APPROVAL_GRANTED'
  | 'REJECTION_RECORDED'
  | 'CHANGES_REQUESTED'
  | 'EXCEPTION_RECORDED'
  | 'VERSION_SUPERSEDED'
  | 'EXPORT_GENERATED'
  // Preserved backwards-compatible event types:
  | 'SUBMITTED'
  | 'SCANNED'
  | 'CORRECTION_APPLIED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXCEPTION_GRANTED'
  | 'REVIEW_STARTED'
  | 'RULE_TOGGLED'
  | 'RULE_ADDED'
  | 'RULE_EDITED'
  | 'RULE_DELETED'
  | 'PROFILE_CREATED'
  | 'PROFILE_UPDATED'
  | 'APPROVAL_REQUESTED'
  | 'BRAND_RULES_UPDATED'
  | 'VERSION_INCREMENTED'
  | 'SYSTEM_DEGRADED';

export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'WARNING' | 'BLOCKED' | 'FLAGGED';

export interface AuditActor {
  id?: string;
  name: string;
  email?: string;
  role: PersonaRole;
  isVerified?: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  outcome?: AuditOutcome;
  brandId?: string;
  brandName?: string;
  contentId?: string;
  documentTitle: string;
  contentVersion: string;
  contentVersionId?: string;
  contentHash: string;
  ruleId?: string;
  ruleVersion: string;
  evaluationRunId?: string;
  decisionId?: string;
  parentVersionNumber?: string;
  actorName: string;
  actorRole: PersonaRole;
  actor?: AuditActor;
  summary: string;
  description?: string;
  payload?: Record<string, unknown>;
  isReconstructed?: boolean;
  isImported?: boolean;
  prevEventHash?: string;
  eventHash?: string;
}

export interface GovernanceMetrics {
  totalSubmissions: number;
  totalVersions: number;
  awaitingReviewCount: number;
  approvedCount: number;
  standardApprovedCount: number;
  exceptionApprovedCount: number;
  rejectedCount: number;
  changesRequestedCount: number;
  findingsBySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  evidenceChecks: {
    verified: number;
    unverified: number;
    na: number;
  };
  versionsWithUnresolvedFindings: number;
  compliantVersionsCount: number;
  topTriggeredRules: Array<{
    ruleId: string;
    ruleName: string;
    category: string;
    count: number;
  }>;
  activityByDay: Array<{
    date: string;
    count: number;
    approved: number;
    rejected: number;
  }>;
}

export interface LifecycleStage {
  stage: 'INGESTION' | 'EVALUATION' | 'AI_REVIEW' | 'REVISION' | 'RECHECK' | 'DECISION' | 'SUPERSEDED';
  title: string;
  timestamp: string;
  versionNumber: string;
  actorName?: string;
  actorRole?: PersonaRole;
  summary: string;
  outcome?: AuditOutcome;
  findingsCount?: number;
  criticalCount?: number;
  decisionType?: DecisionType;
  isException?: boolean;
  associatedEventId?: string;
}

export interface ContentLifecycle {
  contentId: string;
  contentTitle: string;
  brandProfileId: string;
  brandProfileName: string;
  currentStatus: WorkflowStatus;
  currentVersionNumber: string;
  createdAt: string;
  stages: LifecycleStage[];
}

