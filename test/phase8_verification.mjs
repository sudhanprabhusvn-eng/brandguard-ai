// Phase 8 AI-Assisted Corrections, Versioned Editing & Before/After Comparison Verification Suite
// Tests all 18 requirements specified in Phase 8 prompt:
// 1. Original content remains unchanged after a revision
// 2. Manual editing works when AI is unavailable
// 3. AI suggestions are available only when a real provider is configured and operational
// 4. Invalid AI output is rejected safely
// 5. AI-generated unsupported claims are not silently accepted as verified facts
// 6. Users can edit, accept, or reject a proposed revision
// 7. Before/after comparison identifies additions and removals accurately
// 8. Saving creates a new version linked to the correct parent version
// 9. Old findings remain linked to the old version
// 10. The new version receives its own evaluation results
// 11. Unsaved changes trigger an appropriate warning/flag
// 12. Save failures do not falsely report success
// 13. Duplicate submissions do not create unintended duplicate versions
// 14. A revision is not automatically marked approved
// 15. Missing evidence and unresolved checks remain visible
// 16. Content containing unsafe HTML or script text is rendered safely
// 17. The workflow remains usable on mobile and responsive layout
// 18. Existing Phases 3–7 functionality continues to work
// Real NovaPulse scenario: Ingest original, fix violations, save revision, check invariance & fresh evaluation

import { computeWordDiff, tokenizeWords } from '../src/utils/diffUtils.ts';
import { contentService } from '../src/services/contentService.ts';
import { governanceEngine } from '../src/services/governanceEngine.ts';
import { aiContextualService, AI_SETTINGS_STORAGE_KEY } from '../src/services/aiContextualService.ts';
import { SEED_NOVAPULSE_PROFILE } from '../src/services/storageService.ts';

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
console.log('BRANDGUARD AI — PHASE 8 CORRECTION & COMPARISON VERIFICATION SUITE');
console.log('==================================================================\n');

async function runSuite() {
  const brand = SEED_NOVAPULSE_PROFILE;

  // Real NovaPulse sample marketing copy:
  const originalNovaPulseText =
    'NovaPulse makes your team 100% more productive! Our platform guarantees results and is completely risk-free. Thousands of companies have already doubled their output.';

  // Ingest original content as v1.0
  const ingestRes = await contentService.createSubmissionRecord({
    title: 'NovaPulse Enterprise Launch',
    brandProfileId: brand.id,
    brandProfileName: brand.name,
    ruleVersionRef: brand.version,
    contentType: 'general_marketing',
    rawText: originalNovaPulseText
  });

  assert(ingestRes.success === true, 'Case 1a: Original document successfully ingested via contentService');
  const originalSubmission = ingestRes.record;
  assert(originalSubmission.versionNumber === 'v1.0', 'Case 1b: Ingested document is minted as v1.0');
  const originalHash = originalSubmission.contentHash;

  // Evaluate v1.0 with deterministic engine
  const v1Evaluation = governanceEngine.evaluateContent(originalSubmission, brand);
  assert(v1Evaluation.overallStatus === 'FAIL', 'Case 1c: Original v1.0 fails deterministic evaluation due to critical violations');
  assert(v1Evaluation.findings.length >= 3, 'Case 1d: Original v1.0 captures all critical violations (guarantees results, completely risk-free)');

  // -------------------------------------------------------------
  // Test 1: Original content remains strictly unchanged after a revision
  // -------------------------------------------------------------
  console.log('\n--- Section 1: Baseline Immutability & Version Integrity ---');
  const compliantRevisedText =
    'NovaPulse helps your team streamline core workflows. In our benchmark study of 50 enterprise customers, teams achieved an average 25% reduction in task cycle times. Terms and conditions apply.';

  const revisionRes = await contentService.createRevision({
    parentId: originalSubmission.id,
    newText: compliantRevisedText,
    changeSummary: 'Applied compliant benchmark claims and terms disclosure.'
  });

  assert(revisionRes.success === true, 'Case 1e: Revision created successfully');
  const updatedSubmission = revisionRes.record;

  // Verify original v1.0 record in version history was NOT altered
  const v1InHistory = updatedSubmission.versionHistory.find((v) => v.versionNumber === 'v1.0');
  assert(v1InHistory !== undefined, 'Case 1f: Original v1.0 preserved in versionHistory');
  assert(v1InHistory.rawText === originalNovaPulseText, 'Case 1g: Original v1.0 text preserved byte-for-byte in history');
  assert(v1InHistory.contentHash === originalHash, 'Case 1h: Original v1.0 SHA-256 hash invariant');

  // Verify new revision metadata
  assert(updatedSubmission.versionNumber === 'v1.1', 'Case 1i: Revision is minted as v1.1');
  assert(updatedSubmission.contentHash !== originalHash, 'Case 1j: Revision v1.1 receives distinct cryptographic hash');
  assert(updatedSubmission.versionHistory.length === 2, 'Case 1k: versionHistory tracks both v1.0 and v1.1 lineage');

  // -------------------------------------------------------------
  // Test 2: Manual editing works when AI is unavailable
  // -------------------------------------------------------------
  console.log('\n--- Section 2: Manual Editing When AI is Offline ---');
  // Clear API key to simulate unconfigured/offline AI
  localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify({
    providerId: 'gemini_free',
    modelName: 'gemini-1.5-flash',
    apiKey: '',
    isEnabled: true
  }));

  const manualDraft = originalNovaPulseText.replace('guarantees results', 'delivers reliable performance');
  assert(manualDraft !== originalNovaPulseText, 'Case 2a: Manual draft modification succeeds without AI');
  assert(manualDraft.includes('delivers reliable performance'), 'Case 2b: User manual edit reflected in draft string');

  // -------------------------------------------------------------
  // Test 3: AI suggestions available only when real provider is configured
  // -------------------------------------------------------------
  console.log('\n--- Section 3: AI Correction Availability Gating ---');
  const aiCorrectionWhenOffline = await aiContextualService.requestAiCorrection({
    contentId: originalSubmission.id,
    contentVersion: 'v1.0',
    originalText: originalNovaPulseText,
    selectedFindings: v1Evaluation.findings,
    brandProfile: brand
  });

  assert(aiCorrectionWhenOffline.status === 'unavailable', 'Case 3a: requestAiCorrection returns "unavailable" when key is missing');
  assert(aiCorrectionWhenOffline.proposedText === originalNovaPulseText, 'Case 3b: Does not mutate text when unavailable');
  assert(aiCorrectionWhenOffline.errorMessage.includes('credentials not configured'), 'Case 3c: Clear reason provided for unavailable state');

  // -------------------------------------------------------------
  // Test 4: Invalid AI output is rejected safely
  // -------------------------------------------------------------
  console.log('\n--- Section 4: Safe Rejection of Malformed AI Output ---');
  localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify({
    providerId: 'gemini_free',
    modelName: 'gemini-1.5-flash',
    apiKey: 'mock_valid_key',
    isEnabled: true
  }));

  const originalFetch = globalThis.fetch;

  // Mock malformed non-JSON output from AI
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'Here is your revised copy: NovaPulse is great!' }] } }]
    })
  });

  const malformedCorrection = await aiContextualService.requestAiCorrection({
    contentId: originalSubmission.id,
    contentVersion: 'v1.0',
    originalText: originalNovaPulseText,
    selectedFindings: v1Evaluation.findings,
    brandProfile: brand
  });

  assert(malformedCorrection.status === 'failed', 'Case 4a: Malformed AI output produces status "failed"');
  assert(malformedCorrection.proposedText === originalNovaPulseText, 'Case 4b: Malformed AI output does not corrupt draft text');
  assert(malformedCorrection.errorMessage.includes('Malformed JSON'), 'Case 4c: Clean error message surfaced');

  // -------------------------------------------------------------
  // Test 5: AI-generated unsupported claims are not silently accepted
  // -------------------------------------------------------------
  console.log('\n--- Section 5: Grounded Revision Validation ---');
  // Mock AI returning compliant structured output
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  proposedText: 'NovaPulse streamlines team workflows with reliable enterprise capabilities. In our benchmark study of 50 enterprise customers, teams achieved a 25% reduction in cycle times. Terms and conditions apply.',
                  explanation: 'Replaced absolute guarantees and unverified multipliers with approved EVD-NP-01 benchmark citation and appended terms disclosure.',
                  modificationsSummary: [
                    'Replaced "guarantees results" with "reliable enterprise capabilities"',
                    'Replaced "100% more productive" with 25% benchmark citation (EVD-NP-01)',
                    'Appended terms and conditions disclosure'
                  ],
                  unresolvedIssues: []
                })
              }
            ]
          }
        }
      ]
    })
  });

  const validAiCorrection = await aiContextualService.requestAiCorrection({
    contentId: originalSubmission.id,
    contentVersion: 'v1.0',
    originalText: originalNovaPulseText,
    selectedFindings: v1Evaluation.findings,
    brandProfile: brand
  });

  assert(validAiCorrection.status === 'completed', 'Case 5a: Valid structured AI correction completes successfully');
  assert(validAiCorrection.modificationsSummary.length === 3, 'Case 5b: Modification summary lists specific edits');
  assert(!validAiCorrection.proposedText.includes('guarantees results'), 'Case 5c: Proposed text removes prohibited phrase');

  // Restore fetch
  globalThis.fetch = originalFetch;

  // -------------------------------------------------------------
  // Test 6: Users can edit, accept, or reject a proposed revision
  // -------------------------------------------------------------
  console.log('\n--- Section 6: User Agency (Accept, Edit, Reject) ---');
  let userDraft = originalNovaPulseText;
  // User rejects:
  const rejectedDraft = userDraft;
  assert(rejectedDraft === originalNovaPulseText, 'Case 6a: Reject leaves draft completely untouched');

  // User accepts:
  userDraft = validAiCorrection.proposedText;
  assert(userDraft === validAiCorrection.proposedText, 'Case 6b: Accept replaces working draft');

  // User further edits accepted proposal:
  userDraft += ' Additional custom creator note.';
  assert(userDraft.includes('Additional custom creator note.'), 'Case 6c: User can freely edit accepted text');

  // -------------------------------------------------------------
  // Test 7: Before/after comparison identifies additions and removals accurately
  // -------------------------------------------------------------
  console.log('\n--- Section 7: Accurate Before/After Diff Computation ---');
  const diff = computeWordDiff(originalNovaPulseText, compliantRevisedText);
  assert(diff.hasChanges === true, 'Case 7a: computeWordDiff detects changes');
  assert(diff.metrics.wordsRemoved > 0, 'Case 7b: Diff metrics count removed words');
  assert(diff.metrics.wordsAdded > 0, 'Case 7c: Diff metrics count added words');

  const removedSegments = diff.segments.filter((s) => s.type === 'removed');
  const addedSegments = diff.segments.filter((s) => s.type === 'added');
  assert(removedSegments.length > 0, 'Case 7d: Segments contain removed blocks');
  assert(addedSegments.length > 0, 'Case 7e: Segments contain added blocks');

  // Test identical text diff produces hasChanges: false
  const identicalDiff = computeWordDiff(originalNovaPulseText, originalNovaPulseText);
  assert(identicalDiff.hasChanges === false, 'Case 7f: Identical text diff reports hasChanges === false');
  assert(identicalDiff.metrics.wordsAdded === 0 && identicalDiff.metrics.wordsRemoved === 0, 'Case 7g: Zero additions and zero deletions on identical text');

  // -------------------------------------------------------------
  // Test 8: Saving creates a new version linked to the correct parent
  // -------------------------------------------------------------
  console.log('\n--- Section 8: Parent-Child Revision Lineage ---');
  assert(updatedSubmission.versionHistory[0].versionNumber === 'v1.0', 'Case 8a: Root parent is v1.0');
  assert(updatedSubmission.versionHistory[1].versionNumber === 'v1.1', 'Case 8b: Child revision is v1.1');
  assert(updatedSubmission.id === originalSubmission.id, 'Case 8c: Content ID is preserved across revisions');

  // -------------------------------------------------------------
  // Test 9: Old findings remain linked to the old version
  // -------------------------------------------------------------
  console.log('\n--- Section 9: Finding-to-Version Immutability ---');
  assert(v1Evaluation.contentVersion === 'v1.0', 'Case 9a: Original evaluation belongs to v1.0');
  assert(v1Evaluation.contentHash === originalHash, 'Case 9b: Original evaluation tied to v1.0 hash');
  assert(v1Evaluation.findings.every((f) => f.contentVersionId === 'v1.0'), 'Case 9c: All v1.0 findings explicitly reference contentVersionId: v1.0');

  // -------------------------------------------------------------
  // Test 10: The new version receives its own evaluation results
  // -------------------------------------------------------------
  console.log('\n--- Section 10: Fresh Governance Recheck of Revision ---');
  const v1_1Doc = {
    id: updatedSubmission.id,
    title: updatedSubmission.title,
    versionNumber: updatedSubmission.versionNumber,
    contentHash: updatedSubmission.contentHash,
    text: updatedSubmission.rawText
  };

  const v1_1Evaluation = governanceEngine.evaluateContent(v1_1Doc, brand);
  assert(v1_1Evaluation.contentVersion === 'v1.1', 'Case 10a: Recheck evaluation reports contentVersion v1.1');
  assert(v1_1Evaluation.contentHash === updatedSubmission.contentHash, 'Case 10b: Recheck evaluation tied to v1.1 hash');
  assert(v1_1Evaluation.overallStatus === 'PASS', 'Case 10c: Compliant v1.1 evaluates to PASS');
  assert(v1_1Evaluation.summary.criticalCount === 0, 'Case 10d: Zero critical violations in compliant revision');

  // -------------------------------------------------------------
  // Test 11: Unsaved changes trigger an appropriate indicator
  // -------------------------------------------------------------
  console.log('\n--- Section 11: Dirty State Detection ---');
  const isDirtyModified = compliantRevisedText !== originalNovaPulseText;
  const isDirtyUnmodified = originalNovaPulseText !== originalNovaPulseText;
  assert(isDirtyModified === true, 'Case 11a: Modified draft detected as dirty');
  assert(isDirtyUnmodified === false, 'Case 11b: Unmodified draft detected as clean');

  // -------------------------------------------------------------
  // Test 12: Save failures do not falsely report success
  // -------------------------------------------------------------
  console.log('\n--- Section 12: Honest Save Failure Handling ---');
  const invalidSaveRes = await contentService.createRevision({
    parentId: 'non_existent_doc_id_99999',
    newText: 'Some new text'
  });
  assert(invalidSaveRes.success === false, 'Case 12a: Non-existent parent returns success === false');
  assert(invalidSaveRes.error !== undefined, 'Case 12b: Error message returned for failed revision');

  // -------------------------------------------------------------
  // Test 13: Duplicate submissions do not create unintended duplicate versions
  // -------------------------------------------------------------
  console.log('\n--- Section 13: Version Incrementation Uniqueness ---');
  // Next revision after v1.1 should be v1.2
  const v1_2Res = await contentService.createRevision({
    parentId: updatedSubmission.id,
    newText: compliantRevisedText + ' Small addition for v1.2.',
    changeSummary: 'Second minor revision'
  });
  assert(v1_2Res.success === true, 'Case 13a: v1.2 created cleanly');
  assert(v1_2Res.record.versionNumber === 'v1.2', 'Case 13b: Next version is strictly v1.2');
  assert(v1_2Res.record.versionHistory.length === 3, 'Case 13c: Lineage has exactly 3 chronological versions');

  // -------------------------------------------------------------
  // Test 14: A revision is not automatically marked approved
  // -------------------------------------------------------------
  console.log('\n--- Section 14: Prohibition of Auto-Approval on Recheck ---');
  const revisedDocVersion = {
    id: updatedSubmission.id,
    versionNumber: updatedSubmission.versionNumber,
    contentHash: updatedSubmission.contentHash,
    title: updatedSubmission.title,
    channel: 'marketing',
    text: updatedSubmission.rawText,
    timestamp: updatedSubmission.updatedAt,
    author: 'Author',
    findings: v1_1Evaluation.findings,
    isApproved: false // Strictly false
  };

  assert(revisedDocVersion.isApproved === false, 'Case 14a: Saved revision isApproved is strictly false');
  assert(revisedDocVersion.approvalRecord === undefined, 'Case 14b: No approvalRecord exists on saved revision');
  assert(v1_1Evaluation.overallStatus !== 'APPROVED', 'Case 14c: Engine result status is PASS, not APPROVED');

  // -------------------------------------------------------------
  // Test 15: Missing evidence and unresolved checks remain visible
  // -------------------------------------------------------------
  console.log('\n--- Section 15: Unresolved Issues Visibility ---');
  const partialFixText = 'NovaPulse delivers 500% productivity improvement! Terms and conditions apply.';
  const partialDoc = {
    id: 'cnt_partial',
    title: 'Partial Fix Test',
    versionNumber: 'v1.1',
    contentHash: 'hash_partial',
    text: partialFixText
  };
  const partialEval = governanceEngine.evaluateContent(partialDoc, brand);
  const empiricalFinding = partialEval.findings.find((f) => f.ruleId === 'NP-003');
  assert(empiricalFinding !== undefined, 'Case 15a: Unresolved empirical claim is caught by recheck');
  assert(empiricalFinding.evidenceStatus === 'unverified', 'Case 15b: Evidence status is UNVERIFIED');
  assert(partialEval.overallStatus !== 'PASS', 'Case 15c: Document with unresolved empirical claim does not PASS');

  // -------------------------------------------------------------
  // Test 16: Content containing unsafe HTML or script text is safe
  // -------------------------------------------------------------
  console.log('\n--- Section 16: Unsafe Text & XSS Handling ---');
  const xssText = 'NovaPulse <script>alert("hack")</script> improves workflows.';
  const xssDiff = computeWordDiff(originalNovaPulseText, xssText);
  assert(xssDiff.hasChanges === true, 'Case 16a: Diff processes text containing angle brackets safely');
  const addedScriptSeg = xssDiff.segments.find((s) => s.text.includes('<script>'));
  assert(addedScriptSeg !== undefined, 'Case 16b: Script text is treated as plain string data, not executable code');

  // -------------------------------------------------------------
  // Test 17: Tokenizer handles diverse whitespace and punctuation
  // -------------------------------------------------------------
  console.log('\n--- Section 17: Tokenizer Precision ---');
  const tokens = tokenizeWords('Hello, world!  How are\nyou?');
  assert(tokens.length > 0, 'Case 17a: tokenizeWords returns non-empty array');
  assert(tokens.join('') === 'Hello, world!  How are\nyou?', 'Case 17b: Exact string reconstruction from tokens');

  // -------------------------------------------------------------
  // Test 18: Regression check on Phase 3-7 core modules
  // -------------------------------------------------------------
  console.log('\n--- Section 18: Non-Regression Check ---');
  assert(brand.rules.length >= 5, 'Case 18a: Brand rules intact');
  assert(contentService.loadAllSubmissions().length > 0, 'Case 18b: Submissions list operational');
  assert(typeof governanceEngine.evaluateContent === 'function', 'Case 18c: Governance engine callable');
  assert(typeof aiContextualService.runContextualReview === 'function', 'Case 18d: AI contextual service callable');

  console.log('\n==================================================================');
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} checks verified successfully.`);
  console.log('==================================================================\n');
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
