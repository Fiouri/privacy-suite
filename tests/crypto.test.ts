import { createCipheriv, pbkdf2Sync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  CHARACTER_GROUPS,
  decryptFile,
  encryptFile,
  generatePassword,
  hashFile,
  ITERATIONS,
  MAX_ENCRYPTED_BYTES,
  MAX_FILE_BYTES,
  randomIndex,
  safeFilename,
} from "../src/services/crypto";

const PASSWORD = "long unique test password 🔒";
const fileFrom = (bytes: BlobPart, name = "private.txt") =>
  new File([bytes], name, { type: "text/plain" });

describe("file encryption", () => {
  it("round-trips binary bytes and a Unicode filename with randomized encryption", async () => {
    const raw = new Uint8Array([0, 1, 255, 128, 42]);
    const file = fileFrom(raw, "σημειώσεις.txt");
    const first = await encryptFile(file, PASSWORD);
    const second = await encryptFile(file, PASSWORD);
    expect(Array.from(new Uint8Array(await first.arrayBuffer()))).not.toEqual(
      Array.from(new Uint8Array(await second.arrayBuffer())),
    );
    expect(new TextDecoder().decode(await first.arrayBuffer())).not.toContain(
      file.name,
    );
    const result = await decryptFile(
      fileFrom(await first.arrayBuffer()),
      PASSWORD,
    );
    expect(result.name).toBe(file.name);
    expect(new Uint8Array(await result.blob.arrayBuffer())).toEqual(raw);
    expect(result.blob.type).toBe("application/octet-stream");
  });
  it("round-trips empty files", async () => {
    const result = await encryptFile(fileFrom(""), PASSWORD);
    expect(
      (await decryptFile(fileFrom(await result.arrayBuffer()), PASSWORD)).blob
        .size,
    ).toBe(0);
  });
  it("rejects wrong passwords and changed authenticated data without plaintext", async () => {
    const encrypted = new Uint8Array(
      await (
        await encryptFile(fileFrom("confidential"), PASSWORD)
      ).arrayBuffer(),
    );
    await expect(
      decryptFile(fileFrom(encrypted), "incorrect password"),
    ).rejects.toThrow("Could not decrypt");
    for (const offset of [12, 28, 40, encrypted.length - 1]) {
      const changed = encrypted.slice();
      changed[offset] = (changed[offset] ?? 0) ^ 1;
      await expect(decryptFile(fileFrom(changed), PASSWORD)).rejects.toThrow(
        "Could not decrypt",
      );
    }
    await expect(
      decryptFile(fileFrom(encrypted.slice(0, -1)), PASSWORD),
    ).rejects.toThrow();
  });
  it("rejects unsupported versions, hostile iteration counts and short inputs", async () => {
    const encrypted = new Uint8Array(
      await (await encryptFile(fileFrom("data"), PASSWORD)).arrayBuffer(),
    );
    encrypted[7] = 50;
    await expect(decryptFile(fileFrom(encrypted), PASSWORD)).rejects.toThrow(
      "Unsupported",
    );
    encrypted[7] = 49;
    new DataView(encrypted.buffer).setUint32(8, 0xffffffff);
    await expect(decryptFile(fileFrom(encrypted), PASSWORD)).rejects.toThrow(
      "Unsupported",
    );
    await expect(decryptFile(fileFrom("invalid"), PASSWORD)).rejects.toThrow(
      "not a supported",
    );
  });
  it("interoperates with independently constructed Node crypto ciphertext", async () => {
    const header = Buffer.alloc(40);
    header.write("PSUITE01");
    header.writeUInt32BE(ITERATIONS, 8);
    Buffer.from("00112233445566778899aabbccddeeff", "hex").copy(header, 12);
    Buffer.from("00112233445566778899aabb", "hex").copy(header, 28);
    const metadata = Buffer.from(
      JSON.stringify({ name: "fixture.txt", type: "text/plain" }),
    );
    const prefix = Buffer.alloc(4);
    prefix.writeUInt32BE(metadata.length);
    const key = pbkdf2Sync(
      PASSWORD,
      header.subarray(12, 28),
      ITERATIONS,
      32,
      "sha256",
    );
    const cipher = createCipheriv("aes-256-gcm", key, header.subarray(28));
    cipher.setAAD(header);
    const ciphertext = Buffer.concat([
      cipher.update(
        Buffer.concat([prefix, metadata, Buffer.from("independent fixture")]),
      ),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    const result = await decryptFile(
      fileFrom(Buffer.concat([header, ciphertext])),
      PASSWORD,
    );
    expect(await result.blob.text()).toBe("independent fixture");
    expect(result.name).toBe("fixture.txt");
  });
  it("rejects weak passwords and oversized files before reading data", async () => {
    await expect(encryptFile(fileFrom("data"), "short")).rejects.toThrow("12");
    await expect(
      encryptFile(fileFrom("data"), "x".repeat(1025)),
    ).rejects.toThrow("1,024");
    const oversized = fileFrom("");
    Object.defineProperty(oversized, "size", { value: MAX_FILE_BYTES + 1 });
    const read = vi.spyOn(oversized, "arrayBuffer");
    await expect(encryptFile(oversized, PASSWORD)).rejects.toThrow("50 MiB");
    await expect(hashFile(oversized)).rejects.toThrow("50 MiB");
    expect(read).not.toHaveBeenCalled();
    const hugeEncrypted = fileFrom("");
    Object.defineProperty(hugeEncrypted, "size", {
      value: MAX_ENCRYPTED_BYTES + 1,
    });
    await expect(decryptFile(hugeEncrypted, PASSWORD)).rejects.toThrow(
      "50 MiB",
    );
  });
  it("sanitizes output filenames", () => {
    expect(safeFilename("../unsafe\\file.txt")).toBe("_unsafe_file.txt");
    expect(safeFilename("...")).toBe("recovered-file");
  });
});

describe("SHA-256", () => {
  it("matches standard known-answer vectors", async () => {
    expect(await hashFile(fileFrom("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(await hashFile(fileFrom(""))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

describe("passwords", () => {
  it("honors selected groups, lengths and ambiguity exclusions", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const password = generatePassword(
        24,
        ["lowercase", "uppercase", "numbers", "symbols"],
        true,
      );
      expect(password).toHaveLength(24);
      expect(password).not.toMatch(/[Il1O0o]/);
      for (const group of Object.values(CHARACTER_GROUPS))
        expect([...password].some((char) => group.includes(char))).toBe(true);
      seen.add(password);
    }
    expect(seen.size).toBe(100);
    expect(generatePassword(128, ["numbers"], false)).toMatch(/^\d{128}$/);
  });
  it("rejects invalid settings", () => {
    expect(() => generatePassword(12, [], false)).toThrow();
    expect(() => generatePassword(11, ["numbers"], false)).toThrow();
    expect(() => generatePassword(129, ["numbers"], false)).toThrow();
    expect(() => generatePassword(24, ["numbers", "numbers"], false)).toThrow();
    expect(() => randomIndex(0)).toThrow();
  });
  it("discards out-of-range random bytes to avoid modulo bias", () => {
    let calls = 0;
    const original = crypto.getRandomValues.bind(crypto);
    const spy = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation((array) => {
        if (array instanceof Uint8Array) {
          array.fill(calls++ === 0 ? 255 : 249);
          return array;
        }
        return original(array);
      });
    try {
      expect(randomIndex(10)).toBe(9);
      expect(calls).toBe(2);
    } finally {
      spy.mockRestore();
    }
  });
});
