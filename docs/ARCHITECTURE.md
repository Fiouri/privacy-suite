# Architecture and extension rules

The application is a static React SPA using TypeScript strict mode and Vite. There is no server runtime. Views live in feature folders and call `services/crypto.ts`; the crypto service imports no UI, storage, network, or third-party cryptography. Shared components handle file selection, icons, and explicit clipboard writes.

Each tool owns its state. Switching tools unmounts the previous one. “Clear this tool” remounts it. A shared busy flag prevents navigation, file replacement, and duplicate processing during file operations. Successful crypto operations clear password fields. Blob URLs are created only for explicit results and revoked on replacement/unmount. Browser-native Web Crypto operations are asynchronous; bounded file copying is not streaming and can temporarily use the UI thread.

The build emits an offline worker with a content-derived cache name. Installation atomically precaches the app shell; a failed install cannot mark the app ready. The fetch handler intercepts same-origin GETs for allowlisted assets only, with no query string. It does not cache arbitrary requests. Updates wait for all old clients to close, avoiding mid-operation reloads. Activation deletes only caches with the Privacy Suite prefix. Host this app on a dedicated origin.

## Adding a module

Create `src/features/<module>/` for UI and a focused service for non-UI operations. Add one navigation entry and feature-level tests. Do not add a plugin framework, router, state library, database, or generic service container before a concrete feature requires it. Keep secrets out of URLs, logs, localStorage, sessionStorage, service-worker messages, and cache keys.

| Future feature        | Boundary to preserve / decision needed                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Encrypted local Vault | IndexedDB stores ciphertext only; key held only while unlocked; explicit backup/recovery UX; reviewed key hierarchy and KDF migration      |
| Metadata Cleaner      | Local parsers/encoders; per-format completeness tests; do not promise all metadata removed without verification                            |
| Secure Capsules       | Reuse reviewed crypto boundaries; define format compatibility; never claim enforceable expiry for offline copies                           |
| QR tools              | Local encoding/decoding; camera access only by explicit user action; never auto-open decoded links                                         |
| P2P transfer          | Separate opt-in network feature and revised privacy promise; signaling/relay requirements and cost model must be decided first             |
| Local AI              | Local inference and explicit model import; no silent cloud fallback; model provenance, licensing, memory and download costs reviewed first |

Only the four v0.1 tools are implemented. These entries are design constraints, not hidden or non-functional product buttons.
