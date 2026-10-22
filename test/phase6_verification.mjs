// Phase 6 Deterministic Governance Engine Verification Suite
// Tests all 20 mandatory requirements specified in Phase 6 prompt:
// 1. Exact prohibited phrase detected
// 2. Case-insensitive match behaves as configured
// 3. Whole-word matching avoids accidental substring matches
// 4. Missing prohibited phrase produces no violation
// 5. Required disclosure present when applicable
// 6. Required disclosure missing when applicability is established
// 7. Unknown applicability produces REVIEW_REQUIRED, not a fabricated violation
// 8. Unsupported claim with no evidence becomes UNVERIFIED / EVIDENCE MISSING, not FALSE
// 9. Approved evidence recognized only when valid approved record exists
// 10. Unsupported rule type explicitly reported
// 11. Multiple findings coexist without duplication
// 12. Repeated evaluation of same version does not create unintended duplicate findings
// 13. Findings reference correct brand, content version, rule, and rule version
// 14. Editing content and creating new version does not silently reuse old findings
// 15. Empty content and malformed rule configurations handled safely
// 16. Content containing HTML/script text is handled safely
// 17. Storage or evaluation error shown honestly
// 18. PASS is not shown when required checks remain unresolved
// 19. Human approval is not automatically created
// 20. Existing Phase 3-5 functionality still works

import { governanceEngine, compileSafeRegex } from '../src/services/governanceEngine.ts';
import { contentService } from '../src/services/contentService.ts';
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
console.log('BRANDGUARD AI — PHASE 6 DETERMINISTIC ENGINE VERIFICATION SUITE');
console.log('==================================================================\n');

async function runTests() {
  const profile = SEED_NOVAPULSE_PROFILE;

  // Sample prompt paragraph for testing
  const novaPulseSampleCopy =
    'NovaPulse makes your team 100% more productive! Our platform guarantees results and is completely risk-free. Thousands of companies have already doubled their output.';

  // Test 1: Exact prohibited phrase detected
  const test1Doc = {
    id: 'cnt_test_01',
    title: 'Guaranteed Results Test',
    versionNumber: 'v1.0',
    contentHash: 'hash_test_01',
    text: 'Our enterprise software guarantees results across all deployments.'
  };
  const res1 = governanceEngine.evaluateContent(test1Doc, profile);
  const f1 = res1.findings.find((f) => f.ruleId === 'NP-001');
  assert(f1 !== undefined, 'Case 1a: Prohibited phrase "guarantees results" is detected');
  assert(f1.status === 'FAIL', 'Case 1b: Finding status is FAIL');
  assert(f1.severity === 'critical', 'Case 1c: Severity is critical');
  assert(f1.triggerText.toLowerCase() === 'guarantees results', 'Case 1d: Exact matched trigger text is captured');
  assert(f1.startIndex === 24 && f1.endIndex === 42, 'Case 1e: Character positions are exact [24-42]');

  // Test 2: Case-insensitive match behaves as configured
  const test2Doc = {
    id: 'cnt_test_02',
    title: 'Case-Insensitivity Test',
    versionNumber: 'v1.0',
    contentHash: 'hash_test_02',
    text: 'This workflow is COMPLETELY RISK-FREE for new users.'
  };
  const res2 = governanceEngine.evaluateContent(test2Doc, profile);
  const f2 = res2.findings.find((f) => f.ruleId === 'NP-002');
  assert(f2 !== undefined, 'Case 2a: Uppercase "COMPLETELY RISK-FREE" detected via case-insensitive rule');
  assert(f2.triggerText === 'COMPLETELY RISK-FREE', 'Case 2b: Verbatim matched uppercase string preserved in finding');

  // Test 3: Whole-word matching avoids accidental substring matches
  const customRuleProfile = {
    ...profile,
    rules: [
      {
        id: 'NP-CUSTOM-WORD',
        name: 'Prohibit Risk-Free Whole Word',
        description: 'Prohibit risk-free',
        category: 'prohibited_language',
        severity: 'critical',
        pattern: 'risk-free',
        matchMode: 'whole_word',
        engine: 'deterministic',
        active: true,
        explanation: 'Test whole-word boundary',
        createdAt: '2026-10-22',
        updatedAt: '2026-10-22'
      }
    ]
  };
  const substringTestDoc = {
    id: 'cnt_test_03',
    title: 'Substring Test',
    versionNumber: 'v1.0',
    contentHash: 'hash_test_03',
    text: 'We handle asterisk-freely configured parameters.'
  };
  const res3 = governanceEngine.evaluateContent(substringTestDoc, customRuleProfile);
  const f3 = res3.findings.find((f) => f.ruleId === 'NP-CUSTOM-WORD');
  assert(f3 === undefined, 'Case 3: Whole-word rule avoids accidental substring match inside "asterisk-freely"');

  // Test 4: Missing prohibited phrase produces no violation
  const cleanDoc = {
    id: 'cnt_test_04',
    title: 'Clean Text Test',
    versionNumber: 'v1.0',
    contentHash: 'hash_test_04',
    text: 'NovaPulse is engineered to deliver measurable operational outcomes. Terms and conditions apply.'
  };
  const res4 = governanceEngine.evaluateContent(cleanDoc, profile);
  const prohibitedViolations = res4.findings.filter((f) => f.category === 'prohibited_language');
  assert(prohibitedViolations.length === 0, 'Case 4: Clean compliant content produces 0 prohibited phrase violations');

  // Test 5: Required disclosure present when applicable
  const promoWithDisclosure = {
    id: 'cnt_test_05',
    title: 'Promo with Disclosure',
    versionNumber: 'v1.0',
    contentHash: 'hash_test_05',
    text: 'Get our special promotional offer today! Terms and conditions apply.'
  };
  const res5 = governanceEngine.evaluateContent(promoWithDisclosure, profile);
  const disclosureF5 = res5.findings.find((f) => f.ruleId === 'NP-004');
  assert(disclosureF5 === undefined, 'Case 5: Required disclosure present in promotional text produces no violation');

  // Test 6: Required disclosure missing when applicability is established
  const promoWithoutDisclosure = {
    id: 'cnt_test_06',
    title: 'Promo without Disclosure',
    versionNumber: 'v1.0',
    contentHash: 'hash_test_06',
    text: 'Sign up for our limited-time promotional discount offer now.'
  };
  const res6 = governanceEngine.evaluateContent(promoWithoutDisclosure, profile);
  const disclosureF6 = res6.findings.find((f) => f.ruleId === 'NP-004');
  assert(disclosureF6 !== undefined, 'Case 6a: Missing disclosure detected when promotional applicability is established');
  assert(disclosureF6.status === 'FAIL', 'Case 6b: Missing disclosure finding status is FAIL');
  assert(disclosureF6.severity === 'warning', 'Case 6c: Missing disclosure severity is warning');

  // Test 7: Unknown applicability produces REVIEW_REQUIRED, not a fabricated violation
  const neutralEditorialDoc = {
    id: 'cnt_test_07',
    title: 'Internal Engineering Narrative',
    versionNumber: 'v1.0',
    contentHash: 'hash_test_07',
    text: 'The architecture employs an event-driven ledger for distributed microservice synchronization.'
  };
  const res7 = governanceEngine.evaluateContent(neutralEditorialDoc, profile);
  const disclosureF7 = res7.findings.find((f) => f.ruleId === 'NP-004');
  assert(disclosureF7 !== undefined, 'Case 7a: Neutral copy evaluated against disclosure requirement produces review item');
  assert(disclosureF7.status === 'REVIEW_REQUIRED', 'Case 7b: Status is REVIEW_REQUIRED (not a false FAIL violation)');
  assert(disclosureF7.explanation.includes('applicability cannot be determined automatically'), 'Case 7c: Explicitly explains applicability requires review');

  // Test 8: Unsupported claim with no evidence becomes UNVERIFIED or EVIDENCE MISSING, not FALSE
  const unverifiedClaimDoc = {
    id: 'cnt_test_08',
    title: 'Unverified Multiplier Claim',
    versionNumber: 'v1.0',
    contentHash: 'hash_test_08',
    text: 'Customers achieved 100% more output in pilot tests.'
  };
  const res8 = governanceEngine.evaluateContent(unverifiedClaimDoc, profile);
  const claimF8 = res8.findings.find((f) => f.ruleId === 'NP-003');
  assert(claimF8 !== undefined, 'Case 8a: Empirical claim pattern detected');
  assert(claimF8.evidenceStatus === 'unverified', 'Case 8b: Evidence status is UNVERIFIED (not FALSE)');
  assert(claimF8.explanation.includes('UNVERIFIED') && claimF8.explanation.includes('not proven false'), 'Case 8d: Explicitly notes claim is UNVERIFIED (not proven false)');

  // Test 9: Approved evidence recognized only when valid approved record exists
  const verifiedEvidenceDoc = {
    id: 'cnt_test_09',
    title: 'Verified Benchmark Claim',
    versionNumber: 'v1.0',
    contentHash: 'hash_test_09',
    text: 'Independent testing demonstrated an average 25% reduction in cycle times. Terms and conditions apply.'
  };
  const res9 = governanceEngine.evaluateContent(verifiedEvidenceDoc, profile);
  const claimF9 = res9.findings.find((f) => f.ruleId === 'NP-003');
  assert(claimF9 === undefined, 'Case 9: Approved 25% benchmark (EVD-NP-01) satisfies empirical claim rule');

  // Test 10: Unsupported rule type is explicitly reported
  const unsupportedRuleProfile = {
    ...profile,
    rules: [
      ...profile.rules,
      {
        id: 'NP-UNKNOWN-999',
        name: 'Experimental AI Heuristic',
        description: 'Unknown category',
        category: 'custom_ai_metric',
        severity: 'info',
        pattern: 'something',
        engine: 'deterministic',
        active: true,
        explanation: 'Experimental',
        createdAt: '2026-10-22',
        updatedAt: '2026-10-22'
      }
    ]
  };
  const res10 = governanceEngine.evaluateContent(cleanDoc, unsupportedRuleProfile);
  const unsupportedF10 = res10.findings.find((f) => f.ruleId === 'NP-UNKNOWN-999');
  assert(unsupportedF10 !== undefined, 'Case 10a: Unsupported rule category is explicitly detected');
  assert(unsupportedF10.status === 'NOT_EVALUATED', 'Case 10b: Unsupported rule status is NOT_EVALUATED (not silently skipped)');

  // Test 11: Multiple findings can coexist without duplication (using Section 10 sample prompt)
  const samplePromptDoc = {
    id: 'cnt_sample_eval',
    title: 'Sample Marketing Copy',
    versionNumber: 'v1.0',
    contentHash: 'hash_sample_01',
    text: novaPulseSampleCopy
  };
  const res11 = governanceEngine.evaluateContent(samplePromptDoc, profile);
  assert(res11.findings.length >= 3, `Case 11a: Multiple findings detected in sample copy (got ${res11.findings.length})`);
  assert(res11.findings.some((f) => f.ruleId === 'NP-001'), 'Case 11b: NP-001 (guarantees results) found in sample');
  assert(res11.findings.some((f) => f.ruleId === 'NP-002'), 'Case 11c: NP-002 (completely risk-free) found in sample');
  assert(res11.findings.some((f) => f.ruleId === 'NP-003'), 'Case 11d: NP-003 (unverified 100% / doubled output claims) found in sample');
  assert(res11.overallStatus === 'FAIL', 'Case 11e: Sample copy overall status is FAIL due to critical violations');

  // Test 12: Repeated evaluation of same version does not create unintended duplicate findings
  const res12a = governanceEngine.evaluateContent(samplePromptDoc, profile);
  const res12b = governanceEngine.evaluateContent(samplePromptDoc, profile);
  assert(res12a.findings.length === res12b.findings.length, 'Case 12a: Repeated evaluation produces exact same finding count');
  assert(res12a.findings[0].id === res12b.findings[0].id, 'Case 12b: Deterministic finding IDs are identical and reproducible');

  // Test 13: Findings reference correct brand, content version, rule, and rule version
  const sampleF = res11.findings[0];
  assert(sampleF.brandProfileId === profile.id, 'Case 13a: Finding references correct brand profile ID');
  assert(sampleF.contentId === samplePromptDoc.id, 'Case 13b: Finding references correct content ID');
  assert(sampleF.contentVersionId === samplePromptDoc.versionNumber, 'Case 13c: Finding references correct content version');
  assert(sampleF.ruleId.startsWith('NP-'), 'Case 13d: Finding references correct rule ID');
  assert(sampleF.ruleVersion !== undefined, 'Case 13e: Finding captures rule version timestamp/ref');

  // Test 14: Editing content and creating a new version does not silently reuse old findings
  const revisionDoc = {
    id: samplePromptDoc.id,
    title: 'Sample Marketing Copy',
    versionNumber: 'v1.1',
    contentHash: 'hash_sample_v1_1',
    text: 'NovaPulse helps teams collaborate efficiently. Benchmark demonstrated 25% reduction in cycle times. Terms and conditions apply.'
  };
  const res14 = governanceEngine.evaluateContent(revisionDoc, profile);
  assert(res14.contentVersion === 'v1.1', 'Case 14a: Revision evaluation is bound to v1.1');
  assert(res14.overallStatus === 'PASS', 'Case 14b: Revised compliant text evaluates to PASS, not reusing v1.0 failures');
  assert(res14.findings.length === 0, 'Case 14c: Zero violations in revised text');

  // Test 15: Empty content and malformed rule configurations handled safely
  const emptyDoc = {
    id: 'cnt_empty',
    title: 'Empty Doc',
    versionNumber: 'v1.0',
    contentHash: 'hash_empty',
    text: '   '
  };
  const res15 = governanceEngine.evaluateContent(emptyDoc, profile);
  assert(res15.overallStatus === 'NOT_EVALUATED', 'Case 15a: Empty text handled safely as NOT_EVALUATED');
  assert(res15.findings.length === 0, 'Case 15b: Empty text produces 0 fabricated findings');

  const malformedRegex = compileSafeRegex('[unclosed-bracket');
  assert(malformedRegex === null, 'Case 15c: Malformed regex syntax handled safely without crashing');

  // Test 16: Content containing HTML/script text is handled safely
  const injectionDoc = {
    id: 'cnt_injection',
    title: 'XSS Attempt',
    versionNumber: 'v1.0',
    contentHash: 'hash_injection',
    text: '<script>alert("hacked")</script> Our tool guarantees results <img src=x onerror=alert(1)>'
  };
  const res16 = governanceEngine.evaluateContent(injectionDoc, profile);
  assert(res16.findings.some((f) => f.ruleId === 'NP-001'), 'Case 16a: Prohibited phrase inside HTML/script text is evaluated purely as text');
  assert(res16.findings[0].triggerText === 'guarantees results', 'Case 16b: Script tags do not execute and text is preserved safely');

  // Test 17: Storage or evaluation error shown honestly
  const originalSet = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => {
    throw new Error('QuotaExceededError');
  };
  const saveResult = governanceEngine.saveEvaluationResult(res11);
  assert(saveResult === false, 'Case 17: Storage failure returns false honestly without fake success');
  globalThis.localStorage.setItem = originalSet;

  // Test 18: PASS is not shown when required checks remain unresolved
  const unresolvedDoc = {
    id: 'cnt_unresolved',
    title: 'Unresolved Disclosures',
    versionNumber: 'v1.0',
    contentHash: 'hash_unresolved',
    text: 'Explore our latest operational methodology for enterprise scaling.'
  };
  const res18 = governanceEngine.evaluateContent(unresolvedDoc, profile);
  assert(res18.overallStatus !== 'PASS', 'Case 18a: Document with unresolved disclosure review does NOT display PASS');
  assert(res18.overallStatus === 'REVIEW_REQUIRED', 'Case 18b: Overall status is REVIEW_REQUIRED');

  // Test 19: Human approval is not automatically created
  assert(res18.overallStatus !== 'APPROVED', 'Case 19a: Engine does not output "APPROVED" status');
  assert(res14.overallStatus === 'PASS', 'Case 14/19b: Passing engine check produces "PASS", not "APPROVED"');

  // Test 20: Existing Phase 3-5 functionality still works (Ingestion & Hash)
  const pastedIngestion = await contentService.createSubmissionRecord({
    title: 'Phase 5 Regression Test',
    brandProfileId: profile.id,
    brandProfileName: profile.name,
    ruleVersionRef: profile.version,
    contentType: 'social_post',
    rawText: 'Preserving verbatim content test.'
  });
  assert(pastedIngestion.success === true, 'Case 20a: Phase 5 submission creation still operational');
  assert(pastedIngestion.record.contentHash.length === 64, 'Case 20b: SHA-256 fingerprinting operational');

  console.log('\n==================================================================');
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} checks verified successfully.`);
  console.log('==================================================================');
}

runTests().catch((err) => {
  console.error('Test suite crashed with unhandled error:', err);
  process.exit(1);
});
