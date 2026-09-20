import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { encryptFile, MAX_FILE_BYTES } from "../../src/services/crypto";

const password = "synthetic browser audit password";

test("confirmation, visibility, clear and tool switching release previous inputs", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Choose file", { exact: true }).setInputFiles({ name: "<img onerror=alert(1)>.txt", mimeType: "text/plain", buffer: Buffer.from("synthetic") });
  await expect(page.getByText("<img onerror=alert(1)>.txt", { exact: true })).toBeVisible();
  await expect(page.locator(".dropzone img")).toHaveCount(0);
  await page.getByLabel("Create a strong password").fill(password);
  await page.getByLabel("Confirm password").fill("different audit password");
  await page.getByRole("button", { name: "Encrypt file", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("The passwords do not match.");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel("Create a strong password")).toHaveAttribute("type", "text");
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Encrypt file", exact: true }).click();
  await expect(page.getByRole("link", { name: "Download .psuite file" })).toBeVisible();
  await expect(page.getByLabel("Create a strong password")).toHaveValue("");
  await expect(page.getByLabel("Confirm password")).toHaveValue("");
  await page.getByRole("button", { name: "Clear this tool" }).click();
  await expect(page.getByRole("link", { name: "Download .psuite file" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encrypt file", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Create a strong password")).toHaveAttribute("type", "password");
  await page.getByLabel("Create a strong password").fill(password);
  await page.getByRole("button", { name: "Hash & verify" }).click();
  await page.getByRole("button", { name: "Encrypt a file", exact: true }).click();
  await expect(page.getByLabel("Create a strong password")).toHaveValue("");
});

test("damaged ciphertext and oversized input return errors without download", async ({ page }, testInfo) => {
  const encrypted = Buffer.from(await (await encryptFile(new File(["audit data"], "audit.txt"), password)).arrayBuffer());
  encrypted[encrypted.length - 1] = (encrypted[encrypted.length - 1] ?? 0) ^ 1;
  await page.goto("/");
  await page.getByRole("button", { name: "Decrypt a file", exact: true }).click();
  await page.getByLabel("Choose file", { exact: true }).setInputFiles({ name: "damaged.psuite", mimeType: "application/octet-stream", buffer: encrypted });
  await page.getByLabel("Enter your password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Decrypt file", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not decrypt");
  await expect(page.getByRole("link", { name: "Download recovered file" })).toHaveCount(0);
  await page.getByRole("button", { name: "Hash & verify" }).click();
  // Playwright limits in-memory payloads to 50 MiB; a real disk file tests the app limit.
  const oversizedPath = testInfo.outputPath("synthetic-oversized.bin");
  await writeFile(oversizedPath, Buffer.alloc(MAX_FILE_BYTES + 1));
  await page.getByLabel("Choose file", { exact: true }).setInputFiles(oversizedPath);
  await page.getByRole("button", { name: "Calculate SHA-256" }).click();
  await expect(page.getByRole("alert")).toContainText("50 MiB");
  await expect(page.getByLabel("SHA-256 fingerprint")).toHaveCount(0);
});

test("drag and drop, same-file reselection, and privacy details", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Hash & verify" }).click();
  await page.locator(".dropzone").evaluate((element) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(["abc"], "dropped.txt", { type: "text/plain" }));
    element.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
  });
  await expect(page.getByText("dropped.txt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Calculate SHA-256" }).click();
  await expect(page.getByLabel("SHA-256 fingerprint")).toHaveText("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const sameFile = { name: "dropped.txt", mimeType: "text/plain", buffer: Buffer.from("abc") };
  for (let i = 0; i < 2; i++) {
    await page.getByLabel("Choose file", { exact: true }).setInputFiles(sameFile);
    await expect(page.getByLabel("SHA-256 fingerprint")).toHaveCount(0);
    await page.getByRole("button", { name: "Calculate SHA-256" }).click();
    await expect(page.getByLabel("SHA-256 fingerprint")).toBeVisible();
  }
  await page.getByRole("button", { name: "Privacy & security", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Privacy is the whole point." })).toBeVisible();
  await page.getByRole("button", { name: "Close privacy details" }).click();
  await expect(page.getByRole("heading", { name: "Privacy is the whole point." })).toHaveCount(0);
});

test("unavailable secure cryptography fails closed", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "crypto", { configurable: true, value: {} });
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("cannot provide secure cryptography");
  await expect(page.getByRole("button", { name: "Encrypt file", exact: true })).toHaveCount(0);
});

test("password length boundaries, settings reset, and clipboard rejection", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Denied for audit"); } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Password generator", exact: true }).click();
  await page.getByLabel("Password length").press("Home");
  await page.getByRole("button", { name: "Generate password", exact: true }).click();
  expect(await page.getByLabel("Generated password").textContent()).toHaveLength(12);
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(page.getByText("Clipboard unavailable.", { exact: false })).toBeVisible();
  await page.getByLabel("Password length").press("End");
  await expect(page.getByLabel("Generated password")).toHaveText("Your next secret.");
  await page.getByLabel("Exclude look-alike characters", { exact: false }).check();
  await page.getByRole("button", { name: "Generate password", exact: true }).click();
  const result = await page.getByLabel("Generated password").textContent();
  expect(result).toHaveLength(128);
  expect(result).not.toMatch(/[Il1O0o]/);
  await page.getByRole("button", { name: "Clear this tool" }).click();
  await expect(page.getByLabel("Generated password")).toHaveText("Your next secret.");
});

test("copy writes the exact generated password to the isolated browser clipboard", async ({ page, context, browserName, baseURL }) => {
  test.skip(browserName !== "chromium", "Automated clipboard permission grant is Chromium-specific.");
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL ?? "http://127.0.0.1:4173" });
  await page.goto("/");
  await page.getByRole("button", { name: "Password generator", exact: true }).click();
  await page.getByRole("button", { name: "Generate password", exact: true }).click();
  const generated = await page.getByLabel("Generated password").textContent();
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(page.getByText("Copied. Your clipboard", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(generated);
});
