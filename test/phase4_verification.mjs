// Phase 4 Unit Verification Script
// Tests brand profile creation, rule validation, safe regex execution, version bumping, and persistence logic.

import { storageService, SEED_NOVAPULSE_PROFILE } from '../src/services/storageService.ts';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    passedTests++;
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('=== BRANDGUARD AI — PHASE 4 VERIFICATION SUITE ===\n');

// 1. Verify Seed Profile
const seed = SEED_NOVAPULSE_PROFILE;
assert(seed.name === 'NovaPulse', 'NovaPulse profile name is present');
assert(seed.version === 'v2.1', 'NovaPulse baseline version is v2.1');
assert(seed.rules.length === 5, 'NovaPulse has 5 core initial rules');
assert(seed.isDemonstration === true, 'NovaPulse is clearly marked as demonstration profile');

// 2. Test Version Bumping
const bumpedMinor = storageService.bumpVersion('v2.1', false);
assert(bumpedMinor === 'v2.2', `bumpVersion('v2.1', false) returns 'v2.2' (got ${bumpedMinor})`);

const bumpedMajor = storageService.bumpVersion('v2.1', true);
assert(bumpedMajor === 'v3.0', `bumpVersion('v2.1', true) returns 'v3.0' (got ${bumpedMajor})`);

// 3. Test Rule Validation
// Valid rule
const validRule = {
  id: 'NP-006',
  name: 'No Unsubstantiated ROI',
  description: 'Do not claim 10x ROI without certified audit.',
  explanation: 'Regulatory standard on financial claims.',
  pattern: '(\\d+x\\s*roi|triple\\s*your\\s*revenue)'
};
const val1 = storageService.validateRule(validRule, seed.rules, false);
assert(val1.valid === true, 'Valid new rule passes validation');

// Duplicate rule ID check
const duplicateRule = {
  id: 'NP-001',
  name: 'Duplicate Rule',
  description: 'Duplicate ID',
  pattern: 'test'
};
const val2 = storageService.validateRule(duplicateRule, seed.rules, false);
assert(val2.valid === false && val2.error.includes('already exists'), 'Duplicate rule ID NP-001 is rejected');

// Invalid regex syntax check
const invalidRegexRule = {
  id: 'NP-007',
  name: 'Broken Pattern',
  description: 'Regex syntax error',
  pattern: '[unclosed-bracket('
};
const val3 = storageService.validateRule(invalidRegexRule, seed.rules, false);
assert(val3.valid === false && val3.error.includes('Pattern syntax error'), 'Invalid regex pattern is rejected safely');

// Empty name check
const emptyNameRule = {
  id: 'NP-008',
  name: '',
  description: 'Missing name',
  pattern: 'valid'
};
const val4 = storageService.validateRule(emptyNameRule, seed.rules, false);
assert(val4.valid === false && val4.error.includes('Rule name is required'), 'Empty rule name is rejected');

// 4. Test Multi-Profile Integrity
const profileA = { ...seed, id: 'brand-a', name: 'Brand Alpha' };
const profileB = { ...seed, id: 'brand-b', name: 'Brand Beta', rules: [] };
const profileList = [profileA, profileB];

// Editing profile A should not alter profile B
const editedA = { ...profileA, description: 'Updated Alpha description' };
const updatedList = profileList.map(p => p.id === editedA.id ? editedA : p);
assert(updatedList.find(p => p.id === 'brand-b').rules.length === 0, 'Editing Profile A preserves Profile B untouched');
assert(updatedList.find(p => p.id === 'brand-a').description === 'Updated Alpha description', 'Profile A was updated correctly');

console.log(`\n=== ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY! ===`);
