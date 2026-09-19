/** All cryptographic primitives live here. No persistence or network access. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const ITERATIONS = 600_000;
const HEADER_SIZE = 40;
const METADATA_LIMIT = 4096;
export const MAX_ENCRYPTED_BYTES =
  MAX_FILE_BYTES + HEADER_SIZE + 4 + METADATA_LIMIT + 16;
const MAGIC = new TextEncoder().encode("PSUITE01");
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export const requireCrypto = () => {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      "Secure browser cryptography is unavailable. Open this app over HTTPS or localhost.",
    );
};

const checkPassword = (password: string, encrypting: boolean) => {
  if (password.length < (encrypting ? 12 : 1) || password.length > 1024) {
    throw new Error(
      encrypting
        ? "Use a password between 12 and 1,024 characters."
        : "Enter a password between 1 and 1,024 characters.",
    );
  }
};

const deriveKey = async (password: string, salt: Uint8Array<ArrayBuffer>) => {
  const bytes = encoder.encode(password);
  try {
    const material = await crypto.subtle.importKey(
      "raw",
      bytes,
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  } finally {
    bytes.fill(0);
  }
};

// Control characters must be removed from attacker-controlled download names.
export const safeFilename = (name: string) =>
  name
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, "_")
    .replace(/^\.+|[. ]+$/g, "")
    .slice(0, 200) || "recovered-file";

export const encryptFile = async (
  file: File,
  password: string,
): Promise<Blob> => {
  requireCrypto();
  checkPassword(password, true);
  if (file.size > MAX_FILE_BYTES)
    throw new Error("Choose a file of 50 MiB or less.");
  const metadata = encoder.encode(
    JSON.stringify({
      name: safeFilename(file.name),
      type: file.type.slice(0, 255),
    }),
  );
  if (metadata.length > METADATA_LIMIT)
    throw new Error("File metadata is too large.");
  const header = new Uint8Array(HEADER_SIZE);
  header.set(MAGIC);
  new DataView(header.buffer).setUint32(8, ITERATIONS);
  header.set(crypto.getRandomValues(new Uint8Array(16)), 12);
  header.set(crypto.getRandomValues(new Uint8Array(12)), 28);
  const raw = new Uint8Array(await file.arrayBuffer());
  const plaintext = new Uint8Array(4 + metadata.length + raw.length);
  new DataView(plaintext.buffer).setUint32(0, metadata.length);
  plaintext.set(metadata, 4);
  plaintext.set(raw, 4 + metadata.length);
  raw.fill(0);
  try {
    const key = await deriveKey(password, header.slice(12, 28));
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: header.slice(28),
        additionalData: header,
        tagLength: 128,
      },
      key,
      plaintext,
    );
    return new Blob([header, ciphertext], { type: "application/octet-stream" });
  } finally {
    plaintext.fill(0);
  }
};

export const decryptFile = async (
  file: File,
  password: string,
): Promise<{ blob: Blob; name: string }> => {
  requireCrypto();
  checkPassword(password, false);
  if (file.size > MAX_ENCRYPTED_BYTES || file.size < HEADER_SIZE + 16 + 4)
    throw new Error(
      "This is not a supported Privacy Suite file (maximum 50 MiB of original data).",
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = bytes.slice(0, HEADER_SIZE);
  if (
    !MAGIC.every((byte, i) => header[i] === byte) ||
    new DataView(header.buffer).getUint32(8) !== ITERATIONS
  ) {
    throw new Error("Unsupported or damaged Privacy Suite file format.");
  }
  let plaintext: Uint8Array<ArrayBuffer> | undefined;
  try {
    const key = await deriveKey(password, header.slice(12, 28));
    plaintext = new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: header.slice(28),
          additionalData: header,
          tagLength: 128,
        },
        key,
        bytes.slice(HEADER_SIZE),
      ),
    );
    const length = new DataView(plaintext.buffer).getUint32(0);
    if (
      length > METADATA_LIMIT ||
      length < 2 ||
      4 + length > plaintext.length ||
      plaintext.length - 4 - length > MAX_FILE_BYTES
    )
      throw new Error("Invalid metadata.");
    const metadata: unknown = JSON.parse(
      decoder.decode(plaintext.subarray(4, 4 + length)),
    );
    if (
      typeof metadata !== "object" ||
      metadata === null ||
      !("name" in metadata) ||
      typeof metadata.name !== "string" ||
      metadata.name.length > 200 ||
      !("type" in metadata) ||
      typeof metadata.type !== "string" ||
      metadata.type.length > 255
    )
      throw new Error("Invalid metadata.");
    // Always download as a binary attachment; never render untrusted content.
    return {
      blob: new Blob([plaintext.subarray(4 + length)], {
        type: "application/octet-stream",
      }),
      name: safeFilename(metadata.name),
    };
  } catch {
    throw new Error(
      "Could not decrypt. The password is incorrect or the file is damaged.",
    );
  } finally {
    plaintext?.fill(0);
    bytes.fill(0);
  }
};

export const hashFile = async (file: File): Promise<string> => {
  requireCrypto();
  if (file.size > MAX_FILE_BYTES)
    throw new Error("Choose a file of 50 MiB or less.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return Array.from(digest, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  } finally {
    bytes.fill(0);
  }
};

export const CHARACTER_GROUPS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
};
export type CharacterGroup = keyof typeof CHARACTER_GROUPS;
export const randomIndex = (upperBound: number): number => {
  if (!Number.isInteger(upperBound) || upperBound < 1 || upperBound > 256)
    throw new Error("Invalid random range.");
  const limit = 256 - (256 % upperBound);
  const bytes = new Uint8Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while ((bytes[0] ?? 256) >= limit);
  return (bytes[0] ?? 0) % upperBound;
};

export const generatePassword = (
  length: number,
  groups: readonly CharacterGroup[],
  excludeAmbiguous: boolean,
): string => {
  requireCrypto();
  if (
    !Number.isInteger(length) ||
    length < 12 ||
    length > 128 ||
    groups.length === 0 ||
    new Set(groups).size !== groups.length
  )
    throw new Error(
      "Choose 12–128 characters and at least one character group.",
    );
  const sets = groups.map((group) => {
    const chars = CHARACTER_GROUPS[group];
    if (typeof chars !== "string") throw new Error("Invalid character group.");
    return excludeAmbiguous ? chars.replace(/[Il1O0o]/g, "") : chars;
  });
  const alphabet = sets.join("");
  // Rejection sampling keeps every accepted password equally likely while
  // guaranteeing at least one character from every selected group.
  for (let attempt = 0; attempt < 1024; attempt++) {
    const password = Array.from({ length }, () =>
      alphabet.charAt(randomIndex(alphabet.length)),
    ).join("");
    if (
      sets.every((set) =>
        [...password].some((character) => set.includes(character)),
      )
    )
      return password;
  }
  throw new Error("Could not generate a password. Please try again.");
};
