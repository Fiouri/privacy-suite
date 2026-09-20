# Privacy Suite · v0.1.0

**Yours. Only yours.** An MIT-licensed, local-only privacy toolkit built with React, strict TypeScript, and Vite.

[Open Privacy Suite](https://fiouri-privacy-suite.pages.dev/) · [CI](https://github.com/Fiouri/privacy-suite/actions)

Encrypt/decrypt files, generate secure passwords, and calculate/compare SHA-256 hashes. No backend, accounts, analytics, trackers, external runtime APIs, remote fonts, or cloud processing. File processing happens entirely in the browser. After the application shell is cached, every tool works offline.

## Run locally

Node.js 22.12+ (Node 24 recommended) and npm:

```sh
npm ci
npm run dev
```

For the production PWA:

```sh
npm run build
npm run preview
```

Open the displayed localhost URL. Service workers are enabled in the production build only. Use HTTPS in deployment; do not open `index.html` using `file://`.

## Verify

```sh
npx playwright install chromium firefox webkit
npm run check
```

On Linux CI, use `npx playwright install --with-deps chromium firefox webkit`. `check` runs strict typechecking, lint, unit/security tests, a production build, and Playwright tests. Browser tests cover real downloads, byte-for-byte recovery, wrong passwords, hashing, generation, offline reloads, no file-operation network requests, cache contents, accessibility, and mobile layout. CI uses only synthetic test data.

## Security boundaries

- AES-256-GCM; 128-bit authentication tag; 96-bit random nonce; 128-bit random salt. PBKDF2-HMAC-SHA-256 with 600,000 iterations. Browser-standard Web Crypto only.
- Original filename and MIME metadata are inside the encrypted payload. The download is generically named `protected.psuite`.
- Encryption passwords must contain 12–1,024 JavaScript string code units. Long, unique random passwords are strongly preferred. No password recovery exists.
- Maximum original file size: **50 MiB**. The browser loads the file into memory; memory use can be several times the input size. No streaming or large-file claim.
- No automatic persistence of user data. Clear a tool, switch tools, or close the page to release its in-memory references. This does not guarantee secure memory erasure. Downloads, original files, and copied clipboard values are outside that lifecycle.
- The hosting provider sees ordinary app requests and IP addresses. It does not receive file content, passwords, hashes, or generated passwords from this app. Disable host-injected analytics and third-party scripts.
- A compromised device, extension, dependency, host, or app update can bypass browser-level protections. **This MVP has not received an independent security audit.**

See [security policy](SECURITY.md), [privacy details](docs/PRIVACY.md), [threat model](docs/THREAT_MODEL.md), and [file format](docs/FILE_FORMAT.md).

## Project structure

```text
src/
  services/crypto.ts       All cryptographic operations; no UI, storage, or network
  features/files/         Encryption/decryption workflow
  features/passwords/     Password generator workflow
  features/hashing/       SHA-256 and comparison workflow
  components/             Shared accessible controls
  App.tsx                 Tool navigation and offline readiness
public/                   Local PWA assets and hosting security headers
tests/                    Security/unit tests and browser tests
docs/                     Architecture, privacy, threats, format, deployment
```

Only React and React DOM ship as runtime dependencies. A small build plugin emits a versioned service worker with an explicit asset allowlist. It caches no file data or generated output. It waits for all existing app tabs to close before activating an update. Browser storage eviction or private-mode restrictions may remove/prevent offline availability.

## Static deployment · €0 infrastructure target

Build command: `npm run build`. Output directory: `dist`. Deploy at the origin root using Cloudflare Pages Free and its included `pages.dev` subdomain. No Functions, Workers, database, paid APIs, or domain purchase are needed. The current free plan offers free static requests; build and asset limits still apply. Provider terms can change, so €0 is a deployment target, not a perpetual pricing guarantee. See [deployment guide](docs/DEPLOYMENT.md).

## Future modules

Vault, Metadata Cleaner, Secure Capsules, QR tools, P2P transfer, and local AI are extension points, not implemented features. [Architecture](docs/ARCHITECTURE.md) describes their boundaries. P2P transfer and network-delivered AI models require a separate explicit product/privacy decision; they are not compatible with a blanket “no data leaves this device” promise without qualification.

## License

MIT. See [LICENSE](LICENSE). Contributions should include tests and an updated threat model when security boundaries change.
