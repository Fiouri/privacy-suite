import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptFile, encryptFile, generatePassword, hashFile, ITERATIONS, MAX_FILE_BYTES, type CharacterGroup } from "../src/services/crypto";

const password = "synthetic audit password 🔐";
const input = (bytes: BlobPart) => new File([bytes], "audit.bin");

// Independent writer exercises parsing after successful authentication.
const authenticatedFixture = (metadata: Buffer, declaredLength = metadata.length) => {
  const header = Buffer.alloc(40);
  header.write("PSUITE01");
  header.writeUInt32BE(ITERATIONS, 8);
  randomBytes(16).copy(header, 12);
  randomBytes(12).copy(header, 28);
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(declaredLength);
  const key = pbkdf2Sync(password, header.subarray(12, 28), ITERATIONS, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, header.subarray(28));
  cipher.setAAD(header);
  return input(Buffer.concat([header, cipher.update(Buffer.concat([prefix, metadata])), cipher.final(), cipher.getAuthTag()]));
};

describe("security boundary audit", () => {
  it("rejects authenticated malformed JSON, types, lengths and UTF-8", async () => {
    const invalid = ["null", "[]", "{}", '{"name":1,"type":""}', '{"name":"x","type":{}}', "not json", JSON.stringify({ name: "x".repeat(201), type: "" }), JSON.stringify({ name: "x", type: "x".repeat(256) })];
    for (const text of invalid) {
      await expect(decryptFile(authenticatedFixture(Buffer.from(text)), password)).rejects.toThrow("Could not decrypt");
    }
    for (const size of [0, 1, 4097, 0xffffffff]) {
      await expect(decryptFile(authenticatedFixture(Buffer.from("{}"), size), password)).rejects.toThrow("Could not decrypt");
    }
    await expect(decryptFile(authenticatedFixture(Buffer.from([0xff, 0xff])), password)).rejects.toThrow("Could not decrypt");
  });

  it("accepts the real 50 MiB boundary and restores every byte", async () => {
    const bytes = new Uint8Array(MAX_FILE_BYTES);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
    const file = input(bytes);
    const digest = createHash("sha256").update(bytes).digest("hex");
    expect(await hashFile(file)).toBe(digest);
    const encrypted = await encryptFile(file, password);
    const recovered = await decryptFile(input(await encrypted.arrayBuffer()), password);
    expect(recovered.blob.size).toBe(MAX_FILE_BYTES);
    expect(createHash("sha256").update(new Uint8Array(await recovered.blob.arrayBuffer())).digest("hex")).toBe(digest);
    const oversized = input(new Uint8Array(MAX_FILE_BYTES + 1));
    await expect(encryptFile(oversized, password)).rejects.toThrow("50 MiB");
    await expect(hashFile(oversized)).rejects.toThrow("50 MiB");
  });

  it("allows independent Node decryption of browser-format output", async () => {
    const original = randomBytes(8192);
    const bytes = Buffer.from(await (await encryptFile(input(original), password)).arrayBuffer());
    const key = pbkdf2Sync(password, bytes.subarray(12, 28), ITERATIONS, 32, "sha256");
    const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(28, 40));
    decipher.setAAD(bytes.subarray(0, 40));
    decipher.setAuthTag(bytes.subarray(-16));
    const plaintext = Buffer.concat([decipher.update(bytes.subarray(40, -16)), decipher.final()]);
    expect(plaintext.subarray(4 + plaintext.readUInt32BE(0))).toEqual(original);
  });

  it("rejects appended data and truncations without returning plaintext", async () => {
    const bytes = new Uint8Array(await (await encryptFile(input("synthetic data"), password)).arrayBuffer());
    for (const length of [0, 1, 39, 40, 59, bytes.length - 1]) {
      await expect(decryptFile(input(bytes.slice(0, length)), password)).rejects.toThrow();
    }
    await expect(decryptFile(input(new Uint8Array([...bytes, 0])), password)).rejects.toThrow();
  });

  it("handles all 15 group combinations at both password length limits", () => {
    const all: CharacterGroup[] = ["lowercase", "uppercase", "numbers", "symbols"];
    for (let mask = 1; mask < 16; mask++) {
      const groups = all.filter((_, index) => mask & (1 << index));
      for (const length of [12, 128]) {
        const result = generatePassword(length, groups, true);
        expect(result).toHaveLength(length);
        expect(result).not.toMatch(/[Il1O0o]/);
      }
    }
  });

  it("round-trips a maximum-length Unicode password without normalization", async () => {
    const longPassword = "🔐".repeat(512);
    const encrypted = await encryptFile(input("boundary"), longPassword);
    expect(await (await decryptFile(input(await encrypted.arrayBuffer()), longPassword)).blob.text()).toBe("boundary");
    await expect(decryptFile(input(await encrypted.arrayBuffer()), longPassword + "x")).rejects.toThrow("1,024");
  });
});
