// Reads a world file (scripts/world/lib/pack.mjs wrote it) back into plain meshes, for what broke away to be kept
// clear of the torn rock and lit with it there. read(file) gives [{ name, positions, normals, light, indices }] in units.
import fs from 'node:fs';

const VIEW = { f32: Float32Array, u8: Uint8Array, i8: Int8Array, u16: Uint16Array, i16: Int16Array, u32: Uint32Array };

export function read(file) {
  const buf = fs.readFileSync(file), long = buf.readUInt32LE(8), head = JSON.parse(buf.subarray(12, 12 + long).toString());
  const base = 12 + long, ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const view = (as, offset, count) => new VIEW[as](ab, base + offset, count);
  return head.meshes.map((m) => {
    const n = m.vertices, positions = new Float32Array(n * 3);
    if (m.position.as === 'f32') positions.set(view('f32', m.position.offset, n * 3));
    else { const q = view('u16', m.position.offset, n * 3); for (let i = 0; i < n * 3; i++) positions[i] = m.at[i % 3] + (q[i] / 65535) * m.size; }
    const normals = new Float32Array(n * 3), a = m.attributes.normal;
    if (a) { const q = view(a.as, a.offset, n * a.width); for (let i = 0; i < n; i++) { let x = q[i * a.width] / 32767, y = q[i * a.width + 1] / 32767, z = q[i * a.width + 2] / 32767; const l = Math.hypot(x, y, z) || 1; normals.set([x / l, y / l, z / l], i * 3); } }
    const light = new Float32Array(n * 4), b = m.attributes.light;
    if (b) { const q = view(b.as, b.offset, n * b.width); for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) light[i * 4 + k] = q[i * b.width + k] / 255; }
    const indices = Uint32Array.from(view(m.index.as, m.index.offset, m.index.count));
    return { name: m.name, positions, normals, light, indices };
  });
}
