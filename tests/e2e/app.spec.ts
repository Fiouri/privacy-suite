import { startOfflineTestHost } from "./support/offlineServer";
import { readFile } from "node:fs/promises";
import { test, expect, type Download } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const readDownload = async (download: Download, path: string): Promise<Buffer> => {
  let bytes: Buffer = Buffer.alloc(0);
  // Windows can briefly lock completed downloads. Retry filesystem access only.
  await expect(async () => {
    await download.saveAs(path);
    bytes = await readFile(path);
  }).toPass({ timeout: 15_000, intervals: [100, 250, 500, 1000] });
  return bytes;
};


test("encrypt, download, reject wrong password, decrypt byte-for-byte, clear", async ({
  page,
}, testInfo) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("blob:")) requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Ready for offline use")).toBeVisible();
  await page.waitForLoadState("networkidle");
  const before = requests.length;
  await page
    .getByLabel("Choose file", { exact: true })
    .setInputFiles({
      name: "private-note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("private test data\0\xff"),
    });
  await page
    .getByLabel("Create a strong password")
    .fill("a strong private password");
  await page.getByLabel("Confirm password").fill("a strong private password");
  await page.getByRole("button", { name: "Encrypt file", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download .psuite file" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("protected.psuite");
  const path = testInfo.outputPath("encrypted-test.psuite");
  const encrypted = await readDownload(download, path);
  expect(encrypted.includes(Buffer.from("private test data"))).toBe(false);
  expect(encrypted.includes(Buffer.from("private-note.txt"))).toBe(false);
  await page
    .getByRole("button", { name: "Decrypt a file", exact: true })
    .click();
  await page
    .getByLabel("Choose file", { exact: true })
    .setInputFiles({
      name: "protected.psuite",
      mimeType: "application/octet-stream",
      buffer: encrypted,
    });
  await page
    .getByLabel("Enter your password", { exact: true })
    .fill("wrong password");
  await page.getByRole("button", { name: "Decrypt file", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not decrypt");
  await expect(
    page.getByRole("link", { name: "Download recovered file" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Enter your password", { exact: true })
    .fill("a strong private password");
  await page.getByRole("button", { name: "Decrypt file", exact: true }).click();
  const recoveredPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download recovered file" }).click();
  const recovered = await recoveredPromise;
  expect(recovered.suggestedFilename()).toBe("private-note.txt");
  const recoveredPath = testInfo.outputPath("recovered-test.txt");
  expect(await readDownload(recovered, recoveredPath)).toEqual(Buffer.from("private test data\0\xff"));
  expect(requests.length).toBe(before);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Clear this tool" }).click();
  await expect(
    page.getByRole("link", { name: "Download recovered file" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  expect(await page.context().cookies()).toEqual([]);
});

test("hash known content, validate comparison and password settings", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Hash & verify" }).click();
  await page
    .getByLabel("Choose file", { exact: true })
    .setInputFiles({
      name: "abc.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("abc"),
    });
  await page.getByRole("button", { name: "Calculate SHA-256" }).click();
  const hash =
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  await expect(page.getByLabel("SHA-256 fingerprint")).toHaveText(hash);
  await page
    .getByLabel("Compare with an expected hash")
    .fill(hash.toUpperCase());
  await expect(page.getByText("Hashes match.", { exact: false })).toBeVisible();
  await page.getByLabel("Compare with an expected hash").fill("0".repeat(64));
  await expect(
    page.getByText("Hashes do not match.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Compare with an expected hash").fill("invalid");
  await expect(
    page.getByText("Enter exactly 64 hexadecimal", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Password generator", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate password", exact: true })
    .click();
  expect(
    await page.getByLabel("Generated password").textContent(),
  ).toHaveLength(24);
  await page.getByLabel("Uppercase").uncheck();
  await page.getByLabel("Lowercase").uncheck();
  await page.getByLabel("Symbols").uncheck();
  await page
    .getByRole("button", { name: "Generate password", exact: true })
    .click();
  await expect(page.getByLabel("Generated password")).toHaveText(/^\d{24}$/);
  await page.getByLabel("Numbers").uncheck();
  await page
    .getByRole("button", { name: "Generate password", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("at least one");
});

test("app shell and all tools work after an offline reload", async ({
  page,
  context,
  browserName,
}) => {
  const host = await startOfflineTestHost();
  try {
    await page.goto(host.origin);
    await expect(page.getByText("Ready for offline use")).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    host.disconnect();
    // WebKit on Windows cannot navigate with Playwright network emulation.
    // All engines still reload against a disconnected server: no network fallback.
    if (browserName !== "webkit") await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Keep your files to yourself." }),
    ).toBeVisible();
    if (browserName !== "webkit")
      await expect(
        page.getByText("Working offline", { exact: true }),
      ).toBeVisible();
    await page
      .getByRole("button", { name: "Password generator", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Generate password", exact: true })
      .click();
    expect(
      await page.getByLabel("Generated password").textContent(),
    ).toHaveLength(24);
    await page.getByRole("button", { name: "Hash & verify" }).click();
    await page
      .getByLabel("Choose file", { exact: true })
      .setInputFiles({ name: "empty", mimeType: "", buffer: Buffer.alloc(0) });
    await page.getByRole("button", { name: "Calculate SHA-256" }).click();
    await expect(page.getByLabel("SHA-256 fingerprint")).toHaveText(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    await page
      .getByRole("button", { name: "Encrypt a file", exact: true })
      .click();
    await page
      .getByLabel("Choose file", { exact: true })
      .setInputFiles({
        name: "offline.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("offline encryption"),
      });
    await page
      .getByLabel("Create a strong password")
      .fill("offline strong password");
    await page.getByLabel("Confirm password").fill("offline strong password");
    await page
      .getByRole("button", { name: "Encrypt file", exact: true })
      .click();
    const pending = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download .psuite file" }).click();
    const downloaded = await pending;
    const path = await downloaded.path();
    if (!path) throw new Error("Missing offline download");
    await page
      .getByRole("button", { name: "Decrypt a file", exact: true })
      .click();
    await page.getByLabel("Choose file", { exact: true }).setInputFiles(path);
    await page
      .getByLabel("Enter your password", { exact: true })
      .fill("offline strong password");
    await page
      .getByRole("button", { name: "Decrypt file", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "Download recovered file" }),
    ).toBeVisible();
    const entries = await page.evaluate(async () => {
      const keys = await caches.keys();
      return (
        await Promise.all(
          keys.map(async (key) =>
            (await (await caches.open(key)).keys()).map(
              (request) => request.url,
            ),
          ),
        )
      ).flat();
    });
    expect(entries.length).toBeGreaterThan(5);
    expect(
      entries.every(
        (url) =>
          url.startsWith(host.origin) &&
          /^(?:\/$|\/index\.html$|\/manifest\.webmanifest$|\/icon[^/]*$|\/assets\/[^?]+$)/.test(
            new URL(url).pathname,
          ),
      ),
    ).toBe(true);
  } finally {
    await host.close();
  }
});

test("accessible tools, mobile layout, no remote assets", async ({ page }) => {
  const remote: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173/"))
      remote.push(request.url());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  for (const tool of [
    "Encrypt a file",
    "Decrypt a file",
    "Password generator",
    "Hash & verify",
  ]) {
    await page.getByRole("button", { name: tool, exact: true }).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  await page
    .getByRole("button", { name: "Encrypt a file", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Keep your files to yourself." }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  expect(remote).toEqual([]);
});
