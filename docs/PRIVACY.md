# Privacy and data lifecycle

No accounts, cookies, analytics, trackers, remote fonts, external runtime APIs, or cloud processing. The deployed app has no API endpoints and no database. Installation and build tools download software dependencies; that is separate from runtime user-data handling.

| Data                                    | Where it exists                                        | When released                                                                  |
| --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Selected file                           | Original filesystem file plus a browser File reference | Reference released on tool clear/switch/page close; original remains untouched |
| Password and confirmation               | Input fields and JavaScript memory                     | Cleared after successful processing or tool clear/switch/page close            |
| Derived key                             | Non-extractable browser CryptoKey                      | Becomes eligible for garbage collection after operation                        |
| Temporary byte arrays                   | Browser memory                                         | Best-effort overwritten in crypto service                                      |
| Result blob / hash / generated password | Browser memory; blob URL for downloads                 | Tool clear/switch/page close; blob URL revoked                                 |
| Download                                | User/browser chosen filesystem destination             | User managed; plaintext downloads are unencrypted                              |
| Clipboard                               | OS/browser clipboard, only after Copy                  | User/OS managed; may sync through OS or clipboard software                     |
| App HTML, JS, CSS, icons, manifest      | Browser Cache Storage                                  | Browser site-data clear, eviction, or versioned cache cleanup                  |

JavaScript strings, File objects, browser-internal copies, paging/swap, extensions, crash dumps, clipboard history, OS backups, and download folders cannot be securely erased by this app. Clearing a tool is reference cleanup, not forensic secure deletion. Some browsers may restore page/form state; use a trusted browser and device.

The static host receives ordinary asset requests and connection metadata such as IP addresses and user agents. It may retain provider-controlled access logs; the app cannot promise otherwise. It receives no user file data or tool results through application code. The service worker may perform ordinary app-update requests while online.

The production response headers disable browser Network Error Logging and clear the host's reporting endpoint registration. These opt-out headers were verified on the deployed HTML, JavaScript, CSS, manifest, icons, and service worker. No analytics script is injected into the verified release.

Offline support requires one successful HTTPS/localhost visit and a completed cache install. “Ready for offline use” means the service worker has activated; storage can subsequently be evicted. Private browsing and browser policies may disable it. Install with the browser install menu or Add to Home Screen when supported. No persistent-storage permission is requested, and installation is optional.

To remove the local app cache, remove the installed PWA and clear site data in browser settings. This does not remove downloaded files or clipboard entries. The app has no export history or user-data database to clear.
