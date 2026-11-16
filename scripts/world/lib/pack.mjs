// Writes meshes to a world file, which the piece loads and never builds (src/pieces/world/files.ts reads it).
//
//   pack('public/world/rock.bin', [{ name, positions, indices, attributes: { normal: { data, size: 3, as: 'i16' } }, info }])
//
// positions is a Float32Array in the world's units. They are stored as 16 bit shares of the mesh's own cube, which
// is exact to about a fifty thousandth of its size: pass exact: true on a mesh to keep them as floats.
// An attribute's `as` is how each number is stored: 'f32', or a normalised integer, 'u8', 'i8', 'u16' or 'i16',
// for numbers between 0 and 1 (u) or -1 and 1 (i). info is anything the part wants to read back, as JSON.
//
// The file: the letters WRLD, a version, the length of a JSON header, the header, then the numbers, each block
// starting on a multiple of four bytes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const KINDS = {
  f32: { bytes: 4, make: (n) => new Float32Array(n), put: (v) => v },
  u8: { bytes: 1, make: (n) => new Uint8Array(n), put: (v) => Math.round(Math.min(1, Math.max(0, v)) * 255) },
  i8: { bytes: 1, make: (n) => new Int8Array(n), put: (v) => Math.round(Math.min(1, Math.max(-1, v)) * 127) },
  u16: { bytes: 2, make: (n) => new Uint16Array(n), put: (v) => Math.round(Math.min(1, Math.max(0, v)) * 65535) },
  i16: { bytes: 2, make: (n) => new Int16Array(n), put: (v) => Math.round(Math.min(1, Math.max(-1, v)) * 32767) },
};
export const VERSION = 1;

export function pack(file, meshes, meta = {}) {
  const blocks = [], header = { version: VERSION, meta, meshes: [] };
  let at = 0;
  const add = (array) => {
    const from = at, bytes = array.byteLength;
    blocks.push(Buffer.from(array.buffer, array.byteOffset, bytes));
    const pad = (4 - (bytes % 4)) % 4;
    if (pad) blocks.push(Buffer.alloc(pad));
    at += bytes + pad;
    return from;
  };
  for (const m of meshes) {
    const n = m.positions.length / 3, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = m.positions[i * 3 + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
    const size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2], 1e-6);
    const out = { name: m.name, vertices: n, at: lo, size, box: [lo, hi], info: m.info ?? {}, attributes: {} };
    if (m.exact) out.position = { as: 'f32', offset: add(new Float32Array(m.positions)) };
    else {
      const q = new Uint16Array(n * 3);
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) q[i * 3 + k] = Math.round(((m.positions[i * 3 + k] - lo[k]) / size) * 65535);
      out.position = { as: 'u16', offset: add(q) };
    }
    for (const [name, a] of Object.entries(m.attributes ?? {})) {
      const kind = KINDS[a.as ?? 'f32'];
      if (!kind) throw new Error(`pack: ${m.name}.${name} has no way of storing '${a.as}'`);
      if (a.data.length !== n * a.size) throw new Error(`pack: ${m.name}.${name} holds ${a.data.length} numbers for ${n} vertices of ${a.size}`);
      // Whole vertices of four bytes, so the graphics card reads them without padding of its own.
      const width = kind.bytes === 4 ? a.size : Math.ceil((a.size * kind.bytes) / 4) * 4 / kind.bytes, store = kind.make(n * width);
      for (let i = 0; i < n; i++) for (let k = 0; k < a.size; k++) store[i * width + k] = kind.put(a.data[i * a.size + k]);
      out.attributes[name] = { as: a.as ?? 'f32', size: a.size, width, offset: add(store) };
    }
    if (m.indices) {
      const wide = n > 65535, idx = wide ? new Uint32Array(m.indices) : new Uint16Array(m.indices);
      out.index = { as: wide ? 'u32' : 'u16', count: idx.length, offset: add(idx) };
    }
    header.meshes.push(out);
  }
  const json = Buffer.from(JSON.stringify(header)), pad = (4 - (json.length % 4)) % 4, head = Buffer.alloc(12);
  head.write('WRLD', 0, 'latin1');
  head.writeUInt32LE(VERSION, 4);
  head.writeUInt32LE(json.length + pad, 8);
  mkdirSync(dirname(file), { recursive: true });
  const all = Buffer.concat([head, json, Buffer.alloc(pad, 0x20), ...blocks]);
  writeFileSync(file, all);
  const tris = header.meshes.reduce((s, m) => s + (m.index ? m.index.count / 3 : m.vertices / 3), 0);
  console.log(`pack: ${file} · ${header.meshes.length} meshes · ${Math.round(tris).toLocaleString('en-US')} triangles · ${(all.length / 1048576).toFixed(2)} MB`);
  return header;
}
