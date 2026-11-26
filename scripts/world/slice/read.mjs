// Reads a world file (public/world/*.bin, written by ../lib/pack.mjs) back in Node, as the page reads it
// (src/pieces/world/files.ts): each mesh's positions in the world's units, its triangles and its stored numbers.
//
//   import { read } from './read.mjs'
//   const { meta, meshes } = read('public/world/rock-s.bin')
//   meshes.get('break') = { name, positions: Float32Array(3n), indices: Uint32Array(3t), attributes: { normal: { data: Float32Array, size } }, info }
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const VIEW = { f32: Float32Array, u8: Uint8Array, i8: Int8Array, u16: Uint16Array, i16: Int16Array, u32: Uint32Array };
const MOST = { u8: 255, i8: 127, u16: 65535, i16: 32767 };

export function read(file) {
  let raw = readFileSync(file);
  if (raw.readUInt32LE(0) === 0x5a4c5257) raw = inflateRawSync(raw.subarray(8));
  if (raw.readUInt32LE(0) !== 0x444c5257) throw new Error(`${file} is not a world file`);
  const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const long = raw.readUInt32LE(8), header = JSON.parse(raw.subarray(12, 12 + long).toString('utf8')), base = 12 + long;
  const meshes = new Map();
  for (const m of header.meshes) {
    const n = m.vertices, view = (as, offset, count) => new VIEW[as](buf, base + offset, count);
    let positions;
    if (m.position.as === 'f32') positions = new Float32Array(view('f32', m.position.offset, n * 3));
    else {
      const q = view('u16', m.position.offset, n * 3);
      positions = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) positions[i * 3 + k] = m.at[k] + (q[i * 3 + k] / 65535) * m.size;
    }
    const attributes = {};
    for (const [name, a] of Object.entries(m.attributes)) {
      const store = view(a.as, a.offset, n * a.width), data = new Float32Array(n * a.size), k = MOST[a.as];
      for (let i = 0; i < n; i++) for (let j = 0; j < a.size; j++) data[i * a.size + j] = k ? store[i * a.width + j] / k : store[i * a.width + j];
      attributes[name] = { data, size: a.size };
    }
    let indices;
    if (m.index) indices = new Uint32Array(view(m.index.as, m.index.offset, m.index.count));
    else { indices = new Uint32Array(n); for (let i = 0; i < n; i++) indices[i] = i; }
    meshes.set(m.name, { name: m.name, positions, indices, attributes, info: m.info, box: m.box });
  }
  return { meta: header.meta, meshes };
}
