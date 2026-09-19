# Free static deployment

Prepared for Cloudflare Pages Free. No deployment/account has been created by this source bundle. No backend or paid infrastructure is needed.

## Build settings

| Setting             | Value           |
| ------------------- | --------------- |
| Framework preset    | Vite (or none)  |
| Build command       | `npm run build` |
| Output directory    | `dist`          |
| Node version        | `24`            |
| Root directory      | Repository root |
| Environment secrets | None            |

Use the free `pages.dev` subdomain and the Free plan. Do not enable Pages Functions, Workers, paid add-ons, Cloudflare Web Analytics, browser insights, Zaraz, automatic third-party injection, or scripts such as Rocket Loader. These are not needed and can change privacy/CSP behavior. A purchased custom domain has a separate optional cost.

Git integration can build from the repository; alternatively upload the contents of `dist` through Pages Direct Upload. Publish the app at the origin root, not under a subdirectory: manifest scope, asset URLs, and worker scope intentionally use `/`. Serve from a dedicated origin. On other static hosts, translate `public/_headers` to that host's response-header configuration; merely uploading `_headers` does not apply it outside compatible hosts.

Cloudflare currently documents free, unlimited static asset requests and 500 monthly builds on the Free plan, with 20,000 files/site and 25 MiB per deployed asset. This small app stays below those asset limits. User files are local inputs, never deployed assets. Free-tier limits and pricing can change; use only Free-plan resources to retain the €0/month infrastructure target.

Sources checked during implementation: [Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).

## Release verification

1. Run `npm ci`, install Playwright browsers, and `npm run check` before release.
2. Confirm real HTTPS responses apply CSP, no-referrer, nosniff, frame restrictions, permissions policy, and the `sw.js` no-cache policy.
3. Confirm only your own origin is requested and no analytics code is injected.
4. Visit once and wait for “Ready for offline use”; disconnect and reload. Exercise all tools with synthetic files.
5. Download an encrypted test file, decrypt it, and compare recovered bytes before trusting the deployment.
6. Test installation through the browser's install menu/Add to Home Screen; exact UI depends on browser and OS.
7. Close all tabs/installed app windows to allow a new service worker to activate. Never force an update during file processing.

The source repository is https://github.com/Fiouri/privacy-suite. GitHub Actions verifies pushes and pull requests. Free GitHub-hosted CI for a public repository fits the open-source model; private repository minute limits depend on the account. Protect the default branch, require Verify, and configure private vulnerability reporting after publication.
