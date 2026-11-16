import * as THREE from 'three';
import { slice } from '../../world/build';

// The world's meshes are made ahead by scripts/world/ and shipped as files in public/world/. This reads one: the
// page loads the world and never builds it. scripts/world/lib/pack.mjs writes the format and describes it.

interface Stored { as: 'f32' | 'u8' | 'i8' | 'u16' | 'i16' | 'u32'; offset: number }
interface Header {
  version: number;
  meta: Record<string, unknown>;
  meshes: { name: string; vertices: number; at: [number, number, number]; size: number; box: [[number, number, number], [number, number, number]]; info: Record<string, unknown>; position: Stored; attributes: Record<string, Stored & { size: number; width: number }>; index?: Stored & { count: number } }[];
}
export interface Loaded {
  name: string;
  geometry: THREE.BufferGeometry;
  // Where the mesh's own cube begins, in units, and how large it is: its positions are shares of that cube.
  at: THREE.Vector3;
  size: number;
  info: Record<string, unknown>;
}
export interface WorldFile { meta: Record<string, unknown>; meshes: Map<string, Loaded>; bytes: number }

const VIEW = { f32: Float32Array, u8: Uint8Array, i8: Int8Array, u16: Uint16Array, i16: Int16Array, u32: Uint32Array } as const;
// The names a part's shader reads its stored light by (./light.ts).
const NAMES: Record<string, string> = { light: 'aLight', bounce: 'aBounce' };

export async function load(file: string): Promise<WorldFile> {
  const res = await fetch(`/world/${file}`);
  if (!res.ok) throw new Error(`The world's file ${file} is missing (${res.status}). Make it with: npm run world`);
  const buf = await res.arrayBuffer(), head = new DataView(buf);
  if (head.getUint32(0, true) !== 0x444c5257) throw new Error(`${file} is not a world file`);
  const long = head.getUint32(8, true), header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 12, long))) as Header, base = 12 + long;
  const meshes = new Map<string, Loaded>();
  for (const m of header.meshes) {
    const g = new THREE.BufferGeometry(), n = m.vertices;
    const view = <K extends keyof typeof VIEW>(as: K, offset: number, count: number) => new VIEW[as](buf, base + offset, count);
    if (m.position.as === 'f32') g.setAttribute('position', new THREE.BufferAttribute(view('f32', m.position.offset, n * 3), 3));
    else g.setAttribute('position', new THREE.BufferAttribute(view('u16', m.position.offset, n * 3), 3, true));
    for (const [name, a] of Object.entries(m.attributes)) {
      const data = view(a.as as keyof typeof VIEW, a.offset, n * a.width);
      if (a.width === a.size) g.setAttribute(NAMES[name] ?? name, new THREE.BufferAttribute(data, a.size, a.as !== 'f32'));
      else g.setAttribute(NAMES[name] ?? name, new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(data, a.width), a.size, 0, a.as !== 'f32'));
    }
    if (m.index) g.setIndex(new THREE.BufferAttribute(view(m.index.as as keyof typeof VIEW, m.index.offset, m.index.count), 1));
    const exact = m.position.as === 'f32', lo = new THREE.Vector3(...m.box[0]), hi = new THREE.Vector3(...m.box[1]);
    if (!exact) { lo.sub(new THREE.Vector3(...m.at)).divideScalar(m.size); hi.sub(new THREE.Vector3(...m.at)).divideScalar(m.size); }
    g.boundingBox = new THREE.Box3(lo, hi);
    g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
    meshes.set(m.name, { name: m.name, geometry: g, at: exact ? new THREE.Vector3() : new THREE.Vector3(...m.at), size: exact ? 1 : m.size, info: m.info });
    await slice();
  }
  return { meta: header.meta, meshes, bytes: buf.byteLength };
}

// A mesh of a loaded geometry, put where its numbers say it is, in the world's units.
export function mesh(l: Loaded, material: THREE.Material | THREE.Material[]): THREE.Mesh {
  const m = new THREE.Mesh(l.geometry, material);
  m.position.copy(l.at);
  m.scale.setScalar(l.size);
  m.updateMatrix();
  m.matrixAutoUpdate = false;
  return m;
}
