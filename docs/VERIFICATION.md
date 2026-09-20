# Verification report · Privacy Suite v0.1.0

Verified locally on Windows on 2026-09-19.

Expanded audit on 2026-09-20: 17 unit/security tests, 28 local browser cases passed (2 explicit clipboard-automation skips), and 27 hosted browser cases passed (the same 2 skips plus Windows WebKit offline emulation). Typecheck, lint, build, dependency audit, and repository exposure scans passed. See [audit scope, findings, and limitations](AUDIT-2026-09-20.md). The original release verification below is retained as a historical baseline.

The same checks also passed on Ubuntu in [GitHub Actions run 35461062858](https://github.com/Fiouri/privacy-suite/actions/runs/35461062858), including all three browser engines and the production build artifact.

## Passed

- `npm run typecheck`: strict TypeScript, including tests and build configuration.
- `npm run lint`: no errors or warnings.
- `npm test`: 11 security/unit tests.
- `npm run build`: production static bundle generated successfully.
- `npm run test:e2e`: all 12 tests passed across Chromium, Firefox, and WebKit.
- `npm audit --audit-level=high`: zero reported vulnerabilities at verification time (including development dependencies).
- Desktop (1440 px) and mobile (390 px) screenshots visually inspected.
- Automated WCAG A/AA checks found no violations on all four tool screens after contrast corrections.
- No remote assets requested; no network requests triggered during the tested encryption/decryption workflow.
- No cookies, localStorage, or sessionStorage data created by the tested tool workflow.

## Security cases exercised

Binary and Unicode-filename round-trip; empty files; randomized ciphertext; wrong passwords; changed salt, nonce, ciphertext and tag; truncated files; unsupported versions and hostile iteration counts; password and file-size limits; filename sanitization; independent Node crypto interoperability; standard SHA-256 vectors; character-group coverage and random-byte rejection sampling.

Browser tests read real encrypted and decrypted downloads and compare the recovered bytes. Windows can temporarily lock completed downloads, so the tests read the browser's completed download directly with bounded filesystem retries, without creating a second copy. They do not relax cryptographic or content assertions.

All tools work after reloading against a disconnected test server. Chromium and Firefox also use browser offline emulation. Windows WebKit's offline navigation emulation reports an internal browser error, so its test uses the disconnected server without that emulation. No network fallback is available in any of the offline tests. Cache entries are checked to contain only app assets.

## Limits of this verification

- Public deployment verified on 2026-09-20: https://fiouri-privacy-suite.pages.dev/. All eight served build assets match the local build byte-for-byte. HTTPS responses apply CSP, no-referrer, nosniff, frame and permissions restrictions, HSTS, disabled NEL/reporting, worker revalidation, and immutable fingerprinted assets. No script injection was found.
- Hosted browser suite: 11 passed across Chromium, Firefox, and WebKit; one hosted WebKit offline test intentionally skipped because of Windows emulation limitations. Hosted offline reload and all tools passed in Chromium and Firefox; WebKit offline passed separately against the disconnected local server.
- After the hosting-header correction, strict typecheck, lint, all 11 unit tests, build, and all 12 local browser cases passed. Firefox required execution outside the Windows sandbox; its initial sandbox launch failures were resolved by that rerun.
- Browser engines were automated on Windows and Ubuntu CI; physical Android/iOS installation, OS-specific PWA behavior, and low-memory device performance were not tested.
- Automated accessibility checks are not a complete accessibility audit.
- No independent security or cryptographic audit has been performed.
- File processing is bounded to 50 MiB, not streamed. Secure deletion of browser/OS memory is not guaranteed.
