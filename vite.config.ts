import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const offlineShell = (): Plugin => ({
  name: "privacy-suite-offline-shell",
  apply: "build",
  generateBundle(_options, bundle) {
    const files = [
      ...new Set([
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/icon.svg",
        "/icon-192.png",
        "/icon-512.png",
        ...Object.keys(bundle).map((file) => `/${file}`),
      ]),
    ];
    const fingerprint = createHash("sha256").update(JSON.stringify(bundle));
    for (const asset of [
      "manifest.webmanifest",
      "icon.svg",
      "icon-192.png",
      "icon-512.png",
    ])
      fingerprint.update(
        readFileSync(new URL(`./public/${asset}`, import.meta.url)),
      );
    const version = fingerprint.digest("hex").slice(0, 16);
    this.emitFile({
      type: "asset",
      fileName: "sw.js",
      source: `
const CACHE = 'privacy-suite-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('privacy-suite-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.search || !FILES.includes(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(event.request)));
});
`,
    });
  },
});

// Apply the same global production headers during browser verification.
const previewHeaders = Object.fromEntries(
  readFileSync(new URL("./public/_headers", import.meta.url), "utf8")
    .split("/sw.js")[0]!
    .split("\n")
    .filter((line) => line.startsWith("  "))
    .map((line) => {
      const separator = line.indexOf(":");
      return [
        line.slice(0, separator).trim(),
        line.slice(separator + 1).trim(),
      ];
    }),
);
export default defineConfig({
  plugins: [react(), offlineShell()],
  build: { sourcemap: false },
  preview: { headers: previewHeaders },
});
