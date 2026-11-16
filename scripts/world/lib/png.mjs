// Writes a picture made in code as a PNG, for the maps a part stores with its mesh (public/world/).
//
//   png('public/world/rock-fine.png', width, height, data, channels)
//
// data is a Uint8Array or Uint8ClampedArray of width * height * channels numbers, row by row from the top.
// channels is 1 (grey), 3 (red, green, blue) or 4 (with alpha). A map of numbers that are not colors (a normal, a
// height) is read in the page as it is, with no color space: set texture.colorSpace = THREE.NoColorSpace.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

const KIND = { 1: 0, 3: 2, 4: 6 };

export function png(file, width, height, data, channels = 4) {
  if (!(channels in KIND)) throw new Error(`png: ${channels} channels cannot be written`);
  if (data.length !== width * height * channels) throw new Error(`png: ${data.length} numbers for ${width} by ${height} by ${channels}`);
  const row = width * channels + 1, raw = Buffer.alloc(row * height), src = Buffer.from(data.buffer, data.byteOffset, data.length);
  for (let y = 0; y < height; y++) src.copy(raw, y * row + 1, y * width * channels, (y + 1) * width * channels);
  const chunk = (type, body) => {
    const out = Buffer.alloc(body.length + 12);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, 'latin1');
    body.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, body.length + 8)), body.length + 8);
    return out;
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width, 0);
  head.writeUInt32BE(height, 4);
  head[8] = 8;
  head[9] = KIND[channels];
  mkdirSync(dirname(file), { recursive: true });
  const all = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  writeFileSync(file, all);
  console.log(`png: ${file} · ${width} x ${height} · ${(all.length / 1024).toFixed(0)} KB`);
}
