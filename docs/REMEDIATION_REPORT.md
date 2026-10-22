# BrandGuard AI — Remediation Report

## Changes made to this archive

- Updated the default Gemini model identifier from the retired Gemini 1.5 Flash family to `gemini-2.5-flash`. Confirm live availability with the provider before relying on it.
- Moved the user-entered AI key out of persistent localStorage preferences and into sessionStorage for the current browser tab. Existing saved keys are discarded from preferences when the configuration is next saved.
- Changed the Gemini REST request to send the key in the `x-goog-api-key` header rather than a URL query parameter. This does not make a browser-supplied key secret; a server-side proxy is still required for shared production credentials.
- Fixed audit-chain verification to traverse the actual persisted insertion order instead of sorting by timestamps, which could reorder events created in the same millisecond.
- Updated the test runner to invoke Node's TypeScript type-stripping mode for verification scripts that import `.ts` files directly.
- Updated AI setup and deployment documentation to remove inaccurate `@google/genai` / `VITE_GEMINI_API_KEY` claims and to disclose browser-only limitations.

## Verification status in this environment

- Automated regression suites: **8/8 suites passed, 411 checks passed** using `node --experimental-strip-types test/run_all_tests.mjs`. The runner was updated to use Node TypeScript type stripping for child test processes.
- `npm run build` and `npm run lint`: **not verified**. The archived `node_modules` was missing platform-specific native optional dependencies for Rolldown and Oxlint, and the TypeScript package was incomplete after the install attempt. Run a clean `npm ci` from the lockfile in a supported environment, then rerun both commands.
- Live Gemini request: not verified; no real API key was supplied and no paid service was activated.
- Browser visual/e2e tests: not verified in this environment.

## Remaining blockers before public production use

1. Implement a server-side AI proxy and secret management; do not use a shared key in the browser.
2. Add authenticated server-side authorization and persistent database storage for multi-user governance.
3. Run a clean dependency install, production build, lint, all automated suites, and browser e2e tests.
4. Verify model availability and the live request/response contract with a tester-provided key.
5. Deploy only after the above checks pass and with explicit authorization.

## Readiness assessment

**Automated test suites pass, but overall status remains Not Ready for deployment until a clean install, production build, lint, and browser tests pass. Not production ready.** The existing architecture is a browser-only prototype with client-side roles and localStorage-based business records.
