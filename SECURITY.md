# Security policy

Privacy Suite 0.1 is an unaudited MVP. Automated tests are not an independent cryptographic or application security audit. Do not rely on it as the only protection for irreplaceable or high-risk data. Keep an original backup until you have successfully decrypted a test copy.

## Reporting

Do not publish passwords, private files, personal data, or a working exploit against users in a public issue. GitHub private vulnerability reporting is enabled: use [Security → Report a vulnerability](https://github.com/Fiouri/privacy-suite/security/advisories/new) to report privately to the repository maintainers. If that control is unavailable, request a private channel from the maintainer without disclosing exploit details.

Include affected version, browser/OS, minimal reproduction using synthetic data, expected/actual behavior, and impact. No guaranteed response SLA is offered by this initial project.

## Maintenance requirements

- Review dependency and lockfile changes; do not blindly run forced audit fixes.
- Require CI on pull requests and restrict write/deploy access when hosted.
- Review encryption format changes for compatibility and new attack surfaces.
- Never log, persist, upload, or include user secrets in error reports.
- Do not add analytics, third-party scripts, external fonts, remote imports, or cloud fallback paths.
- Serve over HTTPS with `public/_headers` applied. Confirm headers on the real deployment.
- Preserve old-format decryption when introducing a new version, or document migration explicitly.
- An independent review of the format, KDF configuration, update trust, and UI is recommended before a broad public launch.

See [threat model](docs/THREAT_MODEL.md) and [file format](docs/FILE_FORMAT.md).
