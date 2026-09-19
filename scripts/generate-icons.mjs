import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, bytes) => {
  const tag = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, bytes])));
  return Buffer.concat([length, tag, bytes, crc]);
};
for (const size of [192, 512]) {
  const pixels = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const nx = x / size,
        ny = y / size;
      const shield =
        ny > 0.23 &&
        ny < 0.78 &&
        Math.abs(nx - 0.5) < (ny < 0.54 ? 0.22 : (0.8 - ny) * 0.85);
      const inside =
        ny > 0.27 &&
        ny < 0.72 &&
        Math.abs(nx - 0.5) < (ny < 0.53 ? 0.18 : (0.74 - ny) * 0.85);
      const check =
        (nx > 0.38 && nx < 0.48 && Math.abs(ny - (nx + 0.06)) < 0.018) ||
        (nx >= 0.48 && nx < 0.65 && Math.abs(ny - (1.02 - nx)) < 0.018);
      const color =
        (shield && !inside) || check ? [232, 238, 201] : [24, 62, 50];
      pixels.set(color, y * (size * 3 + 1) + 1 + x * 3);
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  writeFileSync(
    new URL(`../public/icon-${size}.png`, import.meta.url),
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(pixels)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
