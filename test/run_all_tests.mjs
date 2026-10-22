// Master Test Runner for BrandGuard AI Verification Suites (Phases 4 - 11)
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const suites = [
  { name: 'Phase 4: Content Ingestion & Boundary Controls', file: 'phase4_verification.mjs' },
  { name: 'Phase 5: Brand Rule Profiles & Evidence Management', file: 'phase5_verification.mjs' },
  { name: 'Phase 6: Deterministic Governance Engine', file: 'phase6_verification.mjs' },
  { name: 'Phase 7: AI Contextual Review & Dual Engine Integrity', file: 'phase7_verification.mjs' },
  { name: 'Phase 8: Fix & Compare Studio (Revisions & Diffs)', file: 'phase8_verification.mjs' },
  { name: 'Phase 9: Human Approval Queue & Governance Controls', file: 'phase9_verification.mjs' },
  { name: 'Phase 10: Audit Trail, Governance Reports & Hash Chaining', file: 'phase10_verification.mjs' },
  { name: 'Phase 11: End-to-End Integration, Security & Regression Suite', file: 'phase11_verification.mjs' }
];

console.log('==================================================================');
console.log('BRANDGUARD AI — COMPREHENSIVE REGRESSION & INTEGRATION TEST RUNNER');
console.log('==================================================================\n');

let totalSuitesPassed = 0;
let totalChecksPassed = 0;
const startTime = Date.now();

for (const suite of suites) {
  process.stdout.write(`Executing ${suite.name}... `);
  const suitePath = join(__dirname, suite.file);

  const res = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['--experimental-strip-types', suitePath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });

  if (res.code === 0) {
    // Extract count of passed checks
    const match = res.stdout.match(/ALL.*?PASSED.*?(\d+)\/(\d+)/i) ||
                  res.stdout.match(/(\d+)\/(\d+)\s+checks verified/i) ||
                  res.stdout.match(/✅ PASS.*?Case (\d+)/g);
    let count = 0;
    if (match && match[1]) {
      count = parseInt(match[1], 10);
    } else {
      const passMatches = res.stdout.match(/✅ PASS/g);
      count = passMatches ? passMatches.length : 0;
    }
    totalChecksPassed += count;
    totalSuitesPassed++;
    console.log(`✅ PASSED (${count} checks)`);
  } else {
    console.log(`❌ FAILED (exit code ${res.code})`);
    console.error(res.stdout);
    console.error(res.stderr);
    process.exit(1);
  }
}

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
console.log('\n==================================================================');
console.log(`ALL SUITES PASSED: ${totalSuitesPassed}/${suites.length} suites (${totalChecksPassed} automated checks) in ${elapsedSec}s`);
console.log('==================================================================\n');
