# Privacy Suite encrypted file format, version 01

This is a small application container around standard cryptographic algorithms, not a new cryptographic algorithm. It is not compatible with ZIP, OpenPGP, age, or other encryption containers. `.psuite` is the suggested extension; parsing uses bytes rather than trusting a filename.

## Layout

All integers are unsigned, big-endian.

| Offset | Length   | Meaning                                                   |
| ------ | -------- | --------------------------------------------------------- |
| 0      | 8        | ASCII `PSUITE01` (magic and version)                      |
| 8      | 4        | PBKDF2 iteration count: exactly 600000 for version 01     |
| 12     | 16       | Cryptographically random salt                             |
| 28     | 12       | Cryptographically random AES-GCM nonce                    |
| 40     | variable | AES-GCM ciphertext followed by 16-byte authentication tag |

The entire 40-byte header is AES-GCM additional authenticated data. Version 01 fixes PBKDF2-HMAC-SHA-256 and AES-256-GCM; there is no attacker-selectable algorithm. Unknown magic/version or iteration counts are rejected before key derivation. Future KDF changes must use a new format version.

## Key derivation

Password is UTF-8 encoded exactly as entered, with no trimming or Unicode normalization. Encryption requires 12–1,024 JavaScript string code units. Decryption accepts 1–1,024 to avoid relying on a UI policy for format decoding. A non-extractable AES-256 key is derived from PBKDF2 with the salt and 600,000 iterations. New salt and nonce are independently generated for every encryption with `crypto.getRandomValues`. The nonce must not be reused with a key.

PBKDF2 was selected because it is available in standard Web Crypto. It is not memory-hard. The work factor follows the current [OWASP PBKDF2-HMAC-SHA-256 guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), but that guidance does not constitute an audit of this file format. Weak passwords remain vulnerable to offline guesses. See [MDN key derivation](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey) and [AES-GCM parameters](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams).

## Authenticated plaintext

1. Four-byte metadata byte length.
2. UTF-8 JSON object with `name` (sanitized original filename) and `type` (original MIME type).
3. Original file bytes.

Metadata is limited to 4,096 bytes, decoded with fatal UTF-8 handling and validated before returning output. Names are bounded to 200 UTF-16 code units, MIME types to 255. Path separators, control characters, and unsafe filename punctuation are replaced. Browser/OS filename handling may further adjust a name. All recovered files use `application/octet-stream` and a download link; the app does not render their contents or trust their MIME type.

Original data is limited to 52,428,800 bytes. Encrypted inputs are limited to 52,432,956 bytes (50 MiB + 40-byte header + 4-byte metadata length + 4,096 metadata bytes + 16-byte tag). Reject oversized inputs before reading them. No attacker-controlled allocations or KDF iteration values are accepted.

Only successful authentication releases plaintext. Wrong passwords, corrupted ciphertext, and invalid authenticated metadata return a failure; no partially decrypted output is returned. Empty original files are supported. File length and format remain visible; there is no padding or sender authentication. The format has no signature, timestamp, expiry, or recovery key.
