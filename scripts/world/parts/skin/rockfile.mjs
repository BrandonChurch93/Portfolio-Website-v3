// Reads a world file back into plain meshes, for the skin to be lit with the torn rock round it and to place what it
// builds against it: read(file) gives [{ name, positions, normals, indices, info }] in units.
import fs from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const VIEW = { f32: Float32Array, u8: Uint8Array, i8: Int8Array, u16: Uint16Array, i16: Int16Array, u32: Uint32Array };
export function read(file) {
  let buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) === 0x5a4c5257) buf = inflateRawSync(buf.subarray(8));
  const long = buf.readUInt32LE(8), head = JSON.parse(buf.subarray(12, 12 + long).toString());
  const base = 12 + long, ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const view = (as, offset, count) => new VIEW[as](ab, base + offset, count);
  return head.meshes.map((m) => {
    const n = m.vertices, positions = new Float32Array(n * 3);
    if (m.position.as === 'f32') positions.set(view('f32', m.position.offset, n * 3));
    else { const q = view('u16', m.position.offset, n * 3); for (let i = 0; i < n * 3; i++) positions[i] = m.at[i % 3] + (q[i] / 65535) * m.size; }
    const normals = new Float32Array(n * 3), a = m.attributes.normal;
    if (a) { const q = view(a.as, a.offset, n * a.width); for (let i = 0; i < n; i++) { const x = q[i * a.width] / 32767, y = q[i * a.width + 1] / 32767, z = q[i * a.width + 2] / 32767, l = Math.hypot(x, y, z) || 1; normals.set([x / l, y / l, z / l], i * 3); } }
    const indices = Uint32Array.from(view(m.index.as, m.index.offset, m.index.count));
    return { name: m.name, positions, normals, indices, info: m.info };
  });
}
