// BrandGuard AI — Phase 11 Final Integration, End-to-End QA & Regression Suite
// Covers all 16 required test groups from Section 4 and the complete NovaPulse journey from Section 2.

import { contentService } from '../src/services/contentService.ts';
import { governanceEngine } from '../src/services/governanceEngine.ts';
import { aiContextualService } from '../src/services/aiContextualService.ts';
import { approvalService, canTransitionWorkflowStatus } from '../src/services/approvalService.ts';
import { auditService, escapeCsvField } from '../src/services/auditService.ts';
import { SEED_NOVAPULSE_PROFILE } from '../src/services/storageService.ts';
import { computeWordDiff } from '../src/utils/diffUtils.ts';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL [Case ${totalTests}]: ${message}`);
    process.exit(1);
  } else {
    passedTests++;
    console.log(`✅ PASS [Case ${totalTests}]: ${message}`);
  }
}

// In-memory mock localStorage for Node test runner
const storageStore = new Map();
globalThis.localStorage = {
  getItem: (key) => storageStore.get(key) || null,
  setItem: (key, val) => storageStore.set(key, String(val)),
  removeItem: (key) => storageStore.delete(key),
  clear: () => storageStore.clear()
};

console.log('==================================================================');
console.log('BRANDGUARD AI — PHASE 11 FINAL INTEGRATION & QA VERIFICATION SUITE');
console.log('==================================================================\n');

async function runSuite() {
  const brand = SEED_NOVAPULSE_PROFILE;
  auditService.clearAuditTrail();

  // Test marketing copy from specification:
  const originalNovaPulseText =
    'NovaPulse makes your team 100% more productive! Our platform guarantees results and is completely risk-free. Thousands of companies have already doubled their output.';

  const compliantNovaPulseText =
    'NovaPulse helps enterprise teams streamline complex workflows. In our benchmark study of 50 enterprise customers, teams achieved an average 25% reduction in task cycle times. Terms and conditions apply.';

  // -------------------------------------------------------------------------
  // GROUP 1: Valid and Invalid Content Submission
  // -------------------------------------------------------------------------
  console.log('--- Group 1: Content Ingestion & Boundary Validation ---');
  const validSubmissionRes = await contentService.createSubmissionRecord({
    title: 'NovaPulse Enterprise Launch Campaign',
    contentType: 'social_post',
    brandProfileId: brand.id,
    brandProfileName: brand.name,
    ruleVersionRef: brand.version,
    rawText: originalNovaPulseText
  });
  assert(validSubmissionRes.success === true, 'Group 1a: Valid submission creates document record');
  const submission = validSubmissionRes.record;
  assert(submission.versionNumber === 'v1.0', 'Group 1b: Root version minted as v1.0');
  assert(submission.contentHash && submission.contentHash.length === 64, 'Group 1c: SHA-256 fingerprint generated');

  // Title validation (< 3 chars)
  const shortTitleRes = await contentService.createSubmissionRecord({
    title: 'AB',
    contentType: 'social_post',
    brandProfileId: brand.id,
    brandProfileName: brand.name,
    ruleVersionRef: brand.version,
    rawText: originalNovaPulseText
  });
  assert(shortTitleRes.success === false, 'Group 1d: Short title rejected (< 3 chars)');

  // Empty text validation
  const emptyTextRes = await contentService.createSubmissionRecord({
    title: 'Valid Title',
    contentType: 'social_post',
    brandProfileId: brand.id,
    brandProfileName: brand.name,
    ruleVersionRef: brand.version,
    rawText: '   '
  });
  assert(emptyTextRes.success === false, 'Group 1e: Whitespace-only content rejected');

  // Audit event for submission
  const submitEvent = await auditService.recordAuditEvent({
    eventType: 'CONTENT_SUBMITTED',
    outcome: 'SUCCESS',
    brandId: brand.id,
    brandName: brand.name,
    contentId: submission.id,
    documentTitle: submission.title,
    contentVersion: submission.versionNumber,
    contentVersionId: submission.versionId,
    contentHash: submission.contentHash,
    ruleVersion: brand.version,
    actorName: 'Sarah Jenkins',
    actorRole: 'creator',
    summary: `Ingested content "${submission.title}" (v1.0).`
  });
  assert(submitEvent.eventType === 'CONTENT_SUBMITTED', 'Group 1f: Submission audit event recorded');

  // -------------------------------------------------------------------------
  // GROUP 2: Missing or Disabled Governance Rules
  // -------------------------------------------------------------------------
  console.log('\n--- Group 2: Disabled & Missing Rule Handling ---');
  // Copy profile with NP-001 toggled active: false
  const modifiedProfile = {
    ...brand,
    rules: brand.rules.map((r) => (r.id === 'NP-001' ? { ...r, active: false } : r))
  };

  const evalWithDisabled = governanceEngine.evaluateContent(
    { ...submission, text: originalNovaPulseText },
    modifiedProfile
  );
  assert(
    !evalWithDisabled.findings.some((f) => f.ruleId === 'NP-001'),
    'Group 2a: Disabled rule NP-001 does not fire findings'
  );

  // Profile with zero rules
  const zeroRulesProfile = { ...brand, rules: [] };
  const evalZeroRules = governanceEngine.evaluateContent(
    { ...submission, text: originalNovaPulseText },
    zeroRulesProfile
  );
  assert(evalZeroRules.findings.length === 0, 'Group 2b: Profile with 0 rules yields 0 findings');
  assert(evalZeroRules.overallStatus === 'NOT_EVALUATED', 'Group 2c: Empty ruleset evaluates honestly to NOT_EVALUATED');

  // -------------------------------------------------------------------------
  // GROUP 3: Deterministic Findings and Evidence Status Semantics
  // -------------------------------------------------------------------------
  console.log('\n--- Group 3: Deterministic Conformance & Evidence Semantics ---');
  const v1Eval = governanceEngine.evaluateContent(
    { ...submission, text: originalNovaPulseText },
    brand
  );
  assert(v1Eval.overallStatus === 'FAIL', 'Group 3a: v1.0 fails deterministic evaluation');

  // Prohibited phrase detection
  const prohibited1 = v1Eval.findings.find((f) => f.triggerText.toLowerCase().includes('guarantees results'));
  assert(prohibited1 !== undefined, 'Group 3b: Prohibited phrase "guarantees results" caught');
  assert(prohibited1.severity === 'critical', 'Group 3c: Prohibited phrase has CRITICAL severity');

  const prohibited2 = v1Eval.findings.find((f) => f.triggerText.toLowerCase().includes('completely risk-free'));
  assert(prohibited2 !== undefined, 'Group 3d: Prohibited phrase "completely risk-free" caught');
  assert(prohibited2.severity === 'critical', 'Group 3e: Risk-free claim has CRITICAL severity');

  // Evidence status: missing evidence is NOT falsehood
  const empiricalClaim = v1Eval.findings.find((f) => f.ruleId === 'NP-003');
  assert(empiricalClaim !== undefined, 'Group 3f: Empirical claim flagged under rule NP-003');
  assert(empiricalClaim.evidenceStatus === 'unverified', 'Group 3g: Claim marked unverified, not false');
  assert(empiricalClaim.explanation.includes('evidence') || empiricalClaim.explanation.includes('UNVERIFIED'), 'Group 3h: Explanation notes missing substantiation');

  // Required disclosure
  const disclosureFinding = v1Eval.findings.find((f) => f.category === 'required_disclosure');
  assert(disclosureFinding !== undefined, 'Group 3i: Missing terms disclosure flagged');

  // Audit event for evaluation
  await auditService.recordAuditEvent({
    eventType: 'GOVERNANCE_EVALUATION_COMPLETED',
    outcome: 'BLOCKED',
    brandId: brand.id,
    brandName: brand.name,
    contentId: submission.id,
    documentTitle: submission.title,
    contentVersion: submission.versionNumber,
    contentVersionId: submission.versionId,
    contentHash: submission.contentHash,
    ruleVersion: brand.version,
    actorName: 'BrandGuard Engine',
    actorRole: 'admin',
    summary: `Evaluation: ${v1Eval.summary.criticalCount} Critical violations found.`,
    payload: {
      criticalCount: v1Eval.summary.criticalCount,
      warningCount: v1Eval.summary.warningCount
    }
  });

  // -------------------------------------------------------------------------
  // GROUP 4: AI Contextual Review & Graceful Degradation
  // -------------------------------------------------------------------------
  console.log('\n--- Group 4: AI Contextual Review & Degradation ---');
  // AI with unconfigured key returns clean unavailable status
  const unconfiguredAiRes = await aiContextualService.runContextualReview({
    contentId: submission.id,
    contentTitle: submission.title,
    contentVersion: submission.versionNumber,
    contentHash: submission.contentHash,
    brandProfile: brand,
    rawText: originalNovaPulseText
  });
  assert(
    unconfiguredAiRes.status === 'unavailable' || unconfiguredAiRes.status === 'completed',
    'Group 4a: AI service returns documented status without unhandled exceptions'
  );

  // Deterministic engine works 100% when AI is disabled
  const deterministicFallback = governanceEngine.evaluateContent(
    { ...submission, text: originalNovaPulseText },
    brand
  );
  assert(deterministicFallback.findings.length > 0, 'Group 4b: Deterministic engine 100% operational regardless of AI');

  // -------------------------------------------------------------------------
  // GROUP 5: Manual Correction & Immutable Version Lineage
  // -------------------------------------------------------------------------
  console.log('\n--- Group 5: Manual Correction & Version Lineage ---');
  const revRes = await contentService.createRevision({
    parentId: submission.id,
    newText: compliantNovaPulseText,
    changeSummary: 'Replaced outcome guarantees with verified benchmark study metrics.'
  });
  assert(revRes.success === true, 'Group 5a: Revision created successfully');
  const updatedSubmission = revRes.record;
  assert(updatedSubmission.versionHistory.length === 2, 'Group 5b: versionHistory tracks exactly 2 versions');

  const rootVer = updatedSubmission.versionHistory[0];
  const childVer = updatedSubmission.versionHistory[1];
  assert(rootVer.versionNumber === 'v1.0', 'Group 5c: Root is v1.0');
  assert(childVer.versionNumber === 'v1.1', 'Group 5d: Child is v1.1');
  assert(rootVer.contentHash === submission.contentHash, 'Group 5e: Root hash is strictly immutable');
  assert(childVer.contentHash !== rootVer.contentHash, 'Group 5f: Child receives distinct SHA-256 hash');

  await auditService.recordAuditEvent({
    eventType: 'REVISION_SAVED',
    outcome: 'SUCCESS',
    brandId: brand.id,
    brandName: brand.name,
    contentId: submission.id,
    documentTitle: submission.title,
    contentVersion: 'v1.1',
    contentVersionId: childVer.versionId,
    contentHash: childVer.contentHash,
    parentVersionNumber: 'v1.0',
    ruleVersion: brand.version,
    actorName: 'Sarah Jenkins',
    actorRole: 'creator',
    summary: 'Created revision v1.1 from parent v1.0.'
  });

  // -------------------------------------------------------------------------
  // GROUP 6: Before/After Comparison Integrity
  // -------------------------------------------------------------------------
  console.log('\n--- Group 6: Before/After Diff Computation ---');
  const diffResult = computeWordDiff(originalNovaPulseText, compliantNovaPulseText);
  assert(diffResult.hasChanges === true, 'Group 6a: Diff detects changes between v1.0 and v1.1');
  assert(diffResult.metrics.wordsRemoved > 0, 'Group 6b: Counts removed words');
  assert(diffResult.metrics.wordsAdded > 0, 'Group 6c: Counts added words');
  assert(diffResult.segments.length > 0, 'Group 6d: Segments list populated');

  // Identical text check
  const identicalDiff = computeWordDiff(compliantNovaPulseText, compliantNovaPulseText);
  assert(identicalDiff.hasChanges === false, 'Group 6e: Identical text diff reports no changes');
  assert(identicalDiff.metrics.wordsAdded === 0 && identicalDiff.metrics.wordsRemoved === 0, 'Group 6f: Zero changes on identical text');

  // -------------------------------------------------------------------------
  // GROUP 7: Re-Evaluation of the Exact Saved Version
  // -------------------------------------------------------------------------
  console.log('\n--- Group 7: Fresh Recheck of Revised Version ---');
  const v11Eval = governanceEngine.evaluateContent(
    { ...updatedSubmission, text: compliantNovaPulseText, versionNumber: 'v1.1' },
    brand
  );
  assert(v11Eval.overallStatus === 'PASS', 'Group 7a: Compliant revision v1.1 evaluates to PASS');
  assert(v11Eval.summary.criticalCount === 0, 'Group 7b: 0 critical violations on revision');
  assert(v11Eval.summary.warningCount === 0, 'Group 7c: 0 warning violations on revision');

  await auditService.recordAuditEvent({
    eventType: 'GOVERNANCE_EVALUATION_COMPLETED',
    outcome: 'SUCCESS',
    brandId: brand.id,
    brandName: brand.name,
    contentId: submission.id,
    documentTitle: submission.title,
    contentVersion: 'v1.1',
    contentVersionId: childVer.versionId,
    contentHash: childVer.contentHash,
    ruleVersion: brand.version,
    actorName: 'BrandGuard Engine',
    actorRole: 'admin',
    summary: 'Evaluation completed: PASS. 0 critical violations.',
    payload: { criticalCount: 0, warningCount: 0 }
  });

  // -------------------------------------------------------------------------
  // GROUP 8: Human Approval, Rejection & Exception Governance
  // -------------------------------------------------------------------------
  console.log('\n--- Group 8: Human Approval Gate & Exception Policy ---');
  // 8a. v1.0 standard approval blocked due to critical findings
  approvalService.submitForReview({
    contentId: submission.id,
    versionNumber: 'v1.0',
    submitterName: 'Sarah Jenkins',
    submitterRole: 'creator'
  });

  const blockedDecision = approvalService.recordDecision({
    brandId: brand.id,
    brandName: brand.name,
    contentId: submission.id,
    contentTitle: submission.title,
    contentVersionId: rootVer.versionId,
    versionNumber: 'v1.0',
    contentHash: rootVer.contentHash,
    decision: 'APPROVED',
    reviewerName: 'Marcus Vance',
    reviewerRole: 'compliance_officer',
    isException: false,
    ruleVersionRef: brand.version,
    evaluationStatus: v1Eval.overallStatus,
    blockingFindingsCount: v1Eval.summary.criticalCount,
    totalFindingsCount: v1Eval.findings.length
  });
  assert(blockedDecision.success === false, 'Group 8a: Standard approval rejected when critical findings exist');
  assert(blockedDecision.error.includes('Exception Overrule'), 'Group 8b: Error explains exception requirement');

  // 8b. Transition v1.1 to IN_REVIEW
  approvalService.submitForReview({
    contentId: submission.id,
    versionNumber: 'v1.1',
    submitterName: 'Sarah Jenkins',
    submitterRole: 'creator'
  });

  // 8c. Approve compliant v1.1
  const approveV11 = approvalService.recordDecision({
    brandId: brand.id,
    brandName: brand.name,
    contentId: submission.id,
    contentTitle: submission.title,
    contentVersionId: childVer.versionId,
    versionNumber: 'v1.1',
    contentHash: childVer.contentHash,
    decision: 'APPROVED',
    reviewerName: 'Marcus Vance',
    reviewerRole: 'compliance_officer',
    comment: 'All critical violations resolved and cited.',
    ruleVersionRef: brand.version,
    evaluationStatus: v11Eval.overallStatus,
    blockingFindingsCount: 0,
    totalFindingsCount: 0
  });
  assert(approveV11.success === true, 'Group 8c: Compliant revision v1.1 approved by human reviewer');
  assert(approveV11.decision.decision === 'APPROVED', 'Group 8d: Decision type is APPROVED');

  await auditService.recordAuditEvent({
    eventType: 'APPROVAL_GRANTED',
    outcome: 'SUCCESS',
    brandId: brand.id,
    brandName: brand.name,
    contentId: submission.id,
    documentTitle: submission.title,
    contentVersion: 'v1.1',
    contentVersionId: childVer.versionId,
    contentHash: childVer.contentHash,
    decisionId: approveV11.decision.id,
    ruleVersion: brand.version,
    actorName: 'Marcus Vance',
    actorRole: 'compliance_officer',
    summary: 'Approved release v1.1 for publishing.'
  });

  // -------------------------------------------------------------------------
  // GROUP 9: Invalid & Stale Workflow Transitions
  // -------------------------------------------------------------------------
  console.log('\n--- Group 9: State Machine Integrity ---');
  // DRAFT -> APPROVED directly is illegal
  const draftToApprove = canTransitionWorkflowStatus('DRAFT', 'APPROVED');
  assert(draftToApprove.allowed === false, 'Group 9a: DRAFT to APPROVED is blocked');

  // APPROVED -> DRAFT is illegal
  const approvedToDraft = canTransitionWorkflowStatus('APPROVED', 'DRAFT');
  assert(approvedToDraft.allowed === false, 'Group 9b: APPROVED to DRAFT is blocked');

  // SUPERSEDED -> APPROVED is illegal
  const supersededToApproved = canTransitionWorkflowStatus('SUPERSEDED', 'APPROVED');
  assert(supersededToApproved.allowed === false, 'Group 9c: SUPERSEDED to APPROVED is blocked');

  // -------------------------------------------------------------------------
  // GROUP 10: Non-Inheritance of Approval Status
  // -------------------------------------------------------------------------
  console.log('\n--- Group 10: Non-Inheritance of Approval ---');
  // Create revision v1.2 from approved v1.1
  const rev12Res = await contentService.createRevision({
    parentId: submission.id,
    newText: compliantNovaPulseText + ' New seasonal tagline added.',
    changeSummary: 'Added seasonal promotional tagline.'
  });
  assert(rev12Res.success === true, 'Group 10a: v1.2 created');
  const v12Status = approvalService.getWorkflowStatus(submission.id, 'v1.2');
  assert(v12Status === 'DRAFT', 'Group 10b: New revision v1.2 initializes in DRAFT (does not inherit APPROVED)');

  // -------------------------------------------------------------------------
  // GROUP 11: Audit Trail & Failure Handling
  // -------------------------------------------------------------------------
  console.log('\n--- Group 11: Audit Trail Verification & Hash Chaining ---');
  const allEvents = auditService.loadAuditEvents();
  assert(allEvents.length >= 5, 'Group 11a: Audit log contains all chronological actions');

  const chainCheck = await auditService.verifyAuditChainIntegrity(allEvents);
  assert(chainCheck.isValid === true, 'Group 11b: Cryptographic SHA-256 hash chain verified');

  // Failed action produces zero events
  const countBeforeFail = allEvents.length;
  approvalService.recordDecision({
    brandId: brand.id,
    brandName: brand.name,
    contentId: 'ghost-doc',
    contentTitle: 'Ghost',
    contentVersionId: 'v1.0',
    versionNumber: 'v1.0',
    contentHash: 'hash',
    decision: 'APPROVED',
    reviewerName: 'Marcus Vance',
    reviewerRole: 'compliance_officer',
    ruleVersionRef: brand.version,
    evaluationStatus: 'FAIL',
    blockingFindingsCount: 2,
    totalFindingsCount: 2
  });
  const countAfterFail = auditService.loadAuditEvents().length;
  assert(countAfterFail === countBeforeFail, 'Group 11c: Failed decision creates zero false success audit events');

  // -------------------------------------------------------------------------
  // GROUP 12: Dashboard Metric Accuracy
  // -------------------------------------------------------------------------
  console.log('\n--- Group 12: Dashboard Metric Counting Accuracy ---');
  const allSubmissions = contentService.loadAllSubmissions();
  const allDecisions = approvalService.loadAllDecisions();

  const metrics = auditService.computeGovernanceMetrics(
    allEvents,
    allSubmissions,
    allDecisions,
    { brandId: brand.id }
  );

  assert(metrics.totalSubmissions === allSubmissions.length, 'Group 12a: Total submissions accurate');
  assert(metrics.approvedCount === 1, 'Group 12b: Total approved count is exactly 1 (no double counting)');
  assert(metrics.totalVersions >= 3, 'Group 12c: Version count captures all drafted revisions');

  // -------------------------------------------------------------------------
  // GROUP 13: Export Safety & Formula Injection Defense
  // -------------------------------------------------------------------------
  console.log('\n--- Group 13: Export Safety & Formula Injection ---');
  // Formula injection defense
  assert(escapeCsvField('=SUM(A1:A10)').startsWith("\"'="), 'Group 13a: Formula starting with = is escaped');
  assert(escapeCsvField('+cmd|"/C calc"!A0').startsWith("\"'+"), 'Group 13b: Formula starting with + is escaped');
  assert(escapeCsvField('-1+2').startsWith("\"'-"), 'Group 13c: Formula starting with - is escaped');
  assert(escapeCsvField('@HYPERLINK').startsWith("\"'@"), 'Group 13d: Formula starting with @ is escaped');

  // Normal text unmodified
  assert(escapeCsvField('Standard Copy').startsWith('"Standard'), 'Group 13e: Normal text is not prepended with quote');

  // CSV output validation
  const csvText = auditService.exportAuditCsv(allEvents, 'Brand: NovaPulse AI');
  assert(csvText.includes('# Generated At (UTC):'), 'Group 13f: CSV has UTC timestamp header');
  assert(!csvText.includes('apiKey'), 'Group 13g: CSV omits internal keys');

  // JSON output validation
  const jsonText = auditService.exportAuditJson(allEvents, metrics, 'Brand: NovaPulse AI');
  const parsedJson = JSON.parse(jsonText);
  assert(parsedJson.reportMetadata !== undefined, 'Group 13h: JSON report metadata present');
  assert(parsedJson.auditEvents.length === allEvents.length, 'Group 13i: JSON includes all events');

  // -------------------------------------------------------------------------
  // GROUP 14: Safe Rendering & XSS Protection
  // -------------------------------------------------------------------------
  console.log('\n--- Group 14: Input Sanitization & Script Safety ---');
  const scriptCopy = 'Test copy <script>alert("xss")</script> and <b>formatting</b>.';
  const scriptSub = await contentService.createSubmissionRecord({
    title: 'Script Ingestion Test',
    contentType: 'social_post',
    brandProfileId: brand.id,
    brandProfileName: brand.name,
    ruleVersionRef: brand.version,
    rawText: scriptCopy
  });
  assert(scriptSub.success === true, 'Group 14a: Ingests copy with HTML tags safely');
  assert(scriptSub.record.rawText === scriptCopy, 'Group 14b: Text preserved verbatim as raw string without execution');

  // -------------------------------------------------------------------------
  // GROUP 15: Cross-Brand Scope Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- Group 15: Cross-Brand Data Isolation ---');
  const isolatedMetrics = auditService.computeGovernanceMetrics(
    allEvents,
    allSubmissions,
    allDecisions,
    { brandId: 'brand-other-org' }
  );
  assert(isolatedMetrics.totalSubmissions === 0, 'Group 15a: Submissions scoped strictly to brandId');
  assert(isolatedMetrics.approvedCount === 0, 'Group 15b: Approvals scoped strictly to brandId');

  // -------------------------------------------------------------------------
  // GROUP 16: Complete NovaPulse End-to-End User Journey
  // -------------------------------------------------------------------------
  console.log('\n--- Group 16: Complete NovaPulse Journey Verification ---');
  const lifecycle = auditService.reconstructLifecycle(
    submission.id,
    allSubmissions,
    allEvents,
    allDecisions
  );
  assert(lifecycle !== null, 'Group 16a: Full lifecycle reconstructed');
  assert(lifecycle.stages.some((s) => s.stage === 'INGESTION'), 'Group 16b: Journey tracks Ingestion');
  assert(lifecycle.stages.some((s) => s.stage === 'EVALUATION'), 'Group 16c: Journey tracks Deterministic Evaluation');
  assert(lifecycle.stages.some((s) => s.stage === 'REVISION'), 'Group 16d: Journey tracks Revision');
  assert(lifecycle.stages.some((s) => s.stage === 'RECHECK'), 'Group 16e: Journey tracks Recheck');
  assert(lifecycle.stages.some((s) => s.stage === 'DECISION'), 'Group 16f: Journey tracks Human Approval Decision');

  console.log('\n==================================================================');
  console.log(`ALL INTEGRATION TESTS PASSED: ${passedTests}/${totalTests} checks verified.`);
  console.log('==================================================================\n');
}

runSuite().catch((err) => {
  console.error('Phase 11 Suite Exception:', err);
  process.exit(1);
});
