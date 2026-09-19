# Initial threat model · v0.1

## Assets and trust boundaries

Assets: file plaintext, original filename, passwords, derived keys, generated passwords, integrity results, and encrypted downloads. Trusted components: device/OS, browser and its Web Crypto/RNG, app source and dependencies, build pipeline, static host and HTTPS delivery. Untrusted inputs: selected files, names, MIME types, encrypted headers/ciphertext, pasted hashes, and user-entered settings.

Data flow: local file picker → browser memory → crypto service → browser memory → explicit local download/copy. The network boundary carries application assets only. The service worker is a privileged app asset and caches an explicit list of app files. No user-controlled path is used as a cache key or network destination.

## Threats and controls

| Threat                           | Control                                                                                           | Residual risk                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Encrypted file stolen            | AES-256-GCM; PBKDF2; independent random salts/nonces                                              | Offline guessing of weak/reused passwords; size and format visible                        |
| Ciphertext/header altered        | Header authenticated as AAD; 128-bit tag; strict version/iteration validation                     | Deletion and denial of availability remain possible                                       |
| Malformed or enormous input      | File-size cap before read; fixed KDF work; bounded metadata; strict parsing                       | Memory can still peak at several times 50 MiB; low-memory devices may fail                |
| Password generator bias          | Web Crypto randomness with byte rejection sampling; whole-password rejection for group coverage   | Browser RNG compromise; clipboard and screen observation                                  |
| Malicious filename/content       | React text escaping; sanitized download name; octet-stream; no content preview                    | User may later open a malicious recovered file outside the app                            |
| Accidental upload/tracking       | No network code in tool modules; no third-party assets; network tests; CSP; lint guards           | Same-origin scripts/compromised deployment can access data                                |
| XSS / injection                  | No HTML injection or eval; restrictive CSP and no inline scripts; no URL state containing secrets | Dependencies/browser vulnerabilities; CSP cannot make malicious same-origin code safe     |
| Browser cache leaks              | Explicit application-asset allowlist; no user data persisted                                      | Browser/OS memory artifacts or form/session restoration                                   |
| Malicious update or supply chain | Lockfile; CI; dependency review; HTTPS; controlled update activation                              | Operator or build compromise defeats confidentiality; web app is not independently signed |
| Session result confusion         | Inputs/navigation disabled during work; output revoked on clear/change; no partial decryption     | Browser tab closure loses progress; user can still close/reload                           |
| Hash substituted with file       | UI says hash is integrity only; expected hash must come from trusted channel                      | SHA-256 alone provides no provenance/authenticity                                         |
| Lost password                    | Confirmation before encryption and prominent recovery warning                                     | No recovery, escrow, reset, or backdoor                                                   |
| Clipboard/OS sync                | Explicit Copy and warning; no auto-copy                                                           | OS may sync clipboard or saved files outside app control                                  |

## Explicit non-goals

No protection against a compromised device, malicious extensions, screen capture, keyloggers, phishing clones, coercion, or an attacker controlling the served app. No anonymity from the hosting provider. No guaranteed secure deletion, cloud-backup exclusion, password recovery, sender identity, key sharing, deniable encryption, or protection of plaintext after download. No arbitrary-size streaming, expiry, self-destruct, or cryptographic erasure claims.

## Required follow-up before broad adoption

Independent review of crypto composition and file format; realistic memory/performance tests on physical mobile devices; review of deployed headers and host settings; restore/decrypt compatibility fixtures for later versions. Automated tests are evidence of tested behavior, not proof of security.
