import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hex, type PaletteName } from '../config/palette';
import { EDGE, PLANET, lift, seat } from '../pieces/skycity/layout';

// The tools the two worlds of Study 31 are built with. He ruled that the planet comes first: what kind of planet it
// is, and then how a city lies on a planet of that kind. So the worlds share no plan, only these tools. Everything is
// in the world's own units and frame (src/pieces/skycity/layout.ts), and stands on the real dome out to its real
// torn edge.

export const R = PLANET.r, D2R = Math.PI / 180, TAU = Math.PI * 2;
// How tall the spire is, whatever it is made of: its tip is where the page's layout puts it, under the buttons.
export const SPIRE_TALL = 280;

// What a world is handed when it is built. room is the room the stage's polished things reflect, at its own
// strength: a material that should show more or less of it than the rest takes it as its own, with dim() below.
export interface Built { room: THREE.Texture | null; level: number }
// A surface seen nearly edge on, as the ground of this world is, mirrors the room behind it however dark its own
// color, and a whole planet came out pale. So how much of the room a material shows is set by hand.
export function dim<T extends THREE.MeshStandardMaterial>(m: T, c: Built, k: number): T {
  m.envMap = c.room;
  m.envMapIntensity = c.level * k;
  return m;
}
export interface Look {
  group: THREE.Group;
  // Called before a frame: the time, and how bright the planet's core burns.
  update?(t: number, core: number): void;
  dispose(): void;
}

export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lin = (name: PaletteName, k = 1): THREE.Color => new THREE.Color(hex(name)).multiplyScalar(k);
// A place on the map from a bearing, in degrees from straight toward the visitor, and a distance from the middle.
export const at = (deg: number, r: number): [number, number] => [Math.sin(deg * D2R) * r, Math.cos(deg * D2R) * r];

// The matrix that stands something built upright at the origin on the ground at a bearing and a distance, facing
// out from the middle, so far above the ground, leaning out by so many degrees, turned so many more about its upright.
export function stand(deg: number, r: number, o: { up?: number; turn?: number; lean?: number; scale?: number } = {}): THREE.Matrix4 {
  const [x, z] = at(deg, r), m = seat(x, z, o.up ?? 0, deg + (o.turn ?? 0));
  if (o.lean) m.multiply(new THREE.Matrix4().makeRotationX(o.lean * D2R));
  if (o.scale && o.scale !== 1) m.multiply(new THREE.Matrix4().makeScale(o.scale, o.scale, o.scale));
  return m;
}

export type Ring = [number, number][];
export const ngon = (n: number, r: number, turn = 0, sx = 1, sz = 1): Ring => Array.from({ length: n }, (_, i) => {
  const a = turn + (i / n) * TAU;
  return [Math.sin(a) * r * sx, Math.cos(a) * r * sz];
});
// A rectangle with its corners cut: w across, d deep, c off each corner.
export const chamfered = (w: number, d: number, c: number): Ring => {
  const x = w / 2, z = d / 2;
  return [[x - c, z], [x, z - c], [x, -z + c], [x - c, -z], [-x + c, -z], [-x, -z + c], [-x, z - c], [-x + c, z]];
};
export const scaled = (p: Ring, k: number, dx = 0, dz = 0): Ring => p.map(([x, z]) => [x * k + dx, z * k + dz]);

// A solid through rings of the same number of points, each at a height, with flat faces: a shaft, a taper, a
// pyramid, a facet. uv is how far round its ring a point is and how high, in units, which is what windows are laid
// out by. uv1 is how tall the whole thing is, and how far up it the point is, 0 to 1.
export function loft(rings: { y: number; p: Ring }[], o: { top?: boolean; tall?: number } = {}): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], uv1: number[] = [], y0 = rings[0].y, tall = o.tall ?? rings[rings.length - 1].y - y0;
  const round = rings.map((r) => { const d = [0]; for (let i = 0; i < r.p.length; i++) { const a = r.p[i], b = r.p[(i + 1) % r.p.length]; d.push(d[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); } return d; });
  const v = (k: number, i: number) => {
    const r = rings[k], q = r.p[i % r.p.length];
    pos.push(q[0], r.y, q[1]);
    uv.push(round[0][i], r.y - y0);
    uv1.push(tall, (r.y - y0) / Math.max(1e-6, tall));
  };
  for (let k = 0; k < rings.length - 1; k++) {
    const n = rings[k].p.length;
    for (let i = 0; i < n; i++) { v(k, i); v(k, i + 1); v(k + 1, i + 1); v(k, i); v(k + 1, i + 1); v(k + 1, i); }
  }
  if (o.top !== false) {
    const k = rings.length - 1, n = rings[k].p.length;
    for (let i = 1; i < n - 1; i++) { v(k, 0); v(k, i); v(k, i + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('uv1', new THREE.Float32BufferAttribute(uv1, 2));
  g.computeVertexNormals();
  return g;
}

// A flat ribbon lying on the ground along a path of places on the map, so wide (it may narrow to its end) and so
// far above the ground. uv runs along it and across it.
export function ribbon(path: [number, number][], w: number, up: number, w1 = w): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3();
  const side = (i: number, s: number, out: THREE.Vector3) => {
    const p = path[i], q = path[Math.min(path.length - 1, i + 1)], o = path[Math.max(0, i - 1)];
    const dx = q[0] - o[0], dz = q[1] - o[1], l = Math.hypot(dx, dz) || 1, half = (w + (w1 - w) * (i / (path.length - 1))) / 2;
    return lift(p[0] + (-dz / l) * half * s, up, p[1] + (dx / l) * half * s, out);
  };
  for (let i = 0; i < path.length - 1; i++) {
    const quad: [number, number][] = [[i, -1], [i, 1], [i + 1, 1], [i, -1], [i + 1, 1], [i + 1, -1]];
    for (const [k, s] of quad) {
      side(k, s, a);
      pos.push(a.x, a.y, a.z);
      n.set(a.x, a.y + R, a.z).normalize();
      nor.push(n.x, n.y, n.z);
      uv.push(k / (path.length - 1), (s + 1) / 2);
    }
  }
  void b;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
export const spoke = (deg: number, r0: number, r1: number, step = 14): [number, number][] => {
  const n = Math.max(1, Math.ceil((r1 - r0) / step));
  return Array.from({ length: n + 1 }, (_, i) => at(deg, r0 + ((r1 - r0) * i) / n));
};
export const arc = (r: number, a0: number, a1: number, step = 3): [number, number][] => {
  const n = Math.max(1, Math.ceil((a1 - a0) / step));
  return Array.from({ length: n + 1 }, (_, i) => at(a0 + ((a1 - a0) * i) / n, r));
};

// The ground: the top of the dome from the middle (or from a distance) out to the torn edge, or to a set distance.
// height lifts it, for a terrace. uv is the bearing as a share of a turn and the distance from the middle in units,
// and the tangent runs out from the middle along the ground, which is what a turned finish is laid along.
export function cap(o: { from?: number; to?: number; rings?: number; spokes?: number; height?: (r: number, deg: number) => number } = {}): THREE.BufferGeometry {
  const rings = o.rings ?? 72, spokes = o.spokes ?? 360, from = o.from ?? 0;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], tan: number[] = [], idx: number[] = [];
  const p = new THREE.Vector3(), q = new THREE.Vector3(), n = new THREE.Vector3();
  for (let j = 0; j <= spokes; j++) {
    const deg = (j / spokes) * 360, end = o.to ?? EDGE.at(deg);
    for (let i = 0; i <= rings; i++) {
      const r = from + ((end - from) * i) / rings, [x, z] = at(deg, r), h = o.height?.(r, deg) ?? 0;
      lift(x, h, z, p);
      const [x1, z1] = at(deg, r + 1);
      lift(x1, o.height?.(r + 1, deg) ?? 0, z1, q).sub(p).normalize();
      n.set(p.x, p.y + R, p.z).normalize();
      pos.push(p.x, p.y, p.z);
      nor.push(n.x, n.y, n.z);
      tan.push(q.x, q.y, q.z, 1);
      uv.push(j / spokes, r);
    }
  }
  const row = rings + 1;
  for (let j = 0; j < spokes; j++) for (let i = 0; i < rings; i++) {
    const a = j * row + i, b = a + row;
    idx.push(a, a + 1, b + 1, a, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('tangent', new THREE.Float32BufferAttribute(tan, 4));
  g.setIndex(idx);
  return g;
}

// Everything of one look that never moves, gathered by material and made one mesh: a look is a handful of draw calls.
export class Pile {
  private bins: THREE.BufferGeometry[][] = [];
  add(g: THREE.BufferGeometry, m: number, to?: THREE.Matrix4): this {
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    for (const name of Object.keys(n.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv' && name !== 'uv1') n.deleteAttribute(name);
    for (const name of ['uv', 'uv1']) if (!n.getAttribute(name)) n.setAttribute(name, new THREE.Float32BufferAttribute(new Float32Array(n.getAttribute('position').count * 2), 2));
    if (to) n.applyMatrix4(to);
    (this.bins[m] ??= []).push(n);
    return this;
  }
  mesh(materials: THREE.Material[]): THREE.Mesh {
    const used: number[] = [], parts: THREE.BufferGeometry[] = [];
    this.bins.forEach((bin, m) => {
      if (!bin?.length) return;
      parts.push(mergeGeometries(bin, false));
      used.push(m);
      for (const b of bin) b.dispose();
    });
    const g = mergeGeometries(parts, true);
    g.groups.forEach((grp, i) => { grp.materialIndex = used[i]; });
    for (const p of parts) p.dispose();
    this.bins = [];
    g.setAttribute('aSurf', g.getAttribute('uv'));
    g.setAttribute('aTall', g.getAttribute('uv1'));
    const mesh = new THREE.Mesh(g, materials);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }
}

// A soft round patch of light, for what a lit thing throws on the ground beside it.
let patchTex: THREE.Texture | null = null;
export function patch(): THREE.Texture {
  if (patchTex) return patchTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.42)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  patchTex = new THREE.CanvasTexture(c);
  return patchTex;
}
export const spillMaterial = (color: THREE.Color): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ map: patch(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true });
// A patch of light on the ground at a place, so far across and so deep, turned to face out from the middle.
export function spill(deg: number, r: number, across: number, deep: number, up = 0.6): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(across, deep, 6, 4).rotateX(-Math.PI / 2).rotateY(deg * D2R), [x, z] = at(deg, r), p = g.getAttribute('position'), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { lift(x + p.getX(i), up, z + p.getZ(i), v); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  return g;
}

// Small helpers for upright solids built at the origin, base on the ground.
export const tube = (r0: number, r1: number, h: number, sides: number, y = 0): THREE.BufferGeometry => new THREE.CylinderGeometry(r1, r0, h, sides, 1).translate(0, y + h / 2, 0);
export const hoop = (r: number, thick: number, y: number, seg = 96, sides = 8): THREE.BufferGeometry => new THREE.TorusGeometry(r, thick, sides, seg).rotateX(Math.PI / 2).translate(0, y, 0);
// A ring lying on the dome at a distance from the middle: its middle is on the planet's upright, lower than the top.
export const groundHoop = (r: number, thick: number, up = 0, seg = 240): THREE.BufferGeometry => hoop((R + up) * Math.sin(r / R), thick, (R + up) * Math.cos(r / R) - R, seg, 6);

// Lit windows on a wall made by loft(): a grid of cells laid out by how far round and how high a point is, each cell
// lit or dark for good, a few brighter than the rest. People live here. Cells finer than a pixel are left out and
// the wall keeps their average, so nothing sparkles. from is the least height of thing that has them, top the share
// of its height they reach, glow a light inside that is strongest at the foot and on the faces turned to the eye
// (for glass), rim a light on its edges. Windows come in neighbourhoods: whole stretches of a wall are dark.
export interface Windows { cell: [number, number]; share: number; power: number; from?: number; top?: number; glow?: number; rim?: number; tint?: PaletteName }
export function windowed<T extends THREE.Material>(m: T, o: Windows): T {
  const before = m.onBeforeCompile, key = m.customProgramCacheKey, hot = lin(o.tint ?? 'hot'), flame = lin('flame'), f = (n: number) => n.toFixed(4);
  m.onBeforeCompile = (sh, r) => {
    before.call(m, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aSurf;\nattribute vec2 aTall;\nvarying vec2 vSurf;\nvarying vec2 vTall;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurf = aSurf;\nvTall = aTall;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vSurf;\nvarying vec2 vTall;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
	vec2 size = vec2( ${f(o.cell[0])}, ${f(o.cell[1])} );
	vec2 at = vSurf / size, cell = floor( at ), in_ = fract( at );
	float rnd = fract( sin( dot( cell, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
	float open = step( 0.2, in_.x ) * step( in_.x, 0.8 ) * step( 0.3, in_.y ) * step( in_.y, 0.78 );
	float fine = max( fwidth( at.x ), fwidth( at.y ) );
	float seen = 1.0 - smoothstep( 0.3, 0.75, fine );
	vec2 block = floor( at / vec2( 3.0, 2.0 ) );
	float hood = step( 0.38, fract( sin( dot( block, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) );
	float lit = hood * step( ${f(1 - o.share)}, rnd ) * ( 0.45 + 1.1 * fract( rnd * 7.31 ) );
	float has = step( ${f(o.from ?? 0)}, vTall.x ) * ( 1.0 - smoothstep( ${f((o.top ?? 0.9) - 0.06)}, ${f(o.top ?? 0.9)}, vTall.y ) ) * step( 0.02, vTall.y );
	float win = has * mix( ${f(o.share * 0.22)}, lit * open, seen );
	vec3 add = vec3( ${f(hot.r)}, ${f(hot.g)}, ${f(hot.b)} ) * ( ${f(o.power)} * win );
	float facing = abs( dot( normal, normalize( vViewPosition ) ) );
	${o.glow ? `add += vec3( ${f(flame.r)}, ${f(flame.g)}, ${f(flame.b)} ) * ( ${f(o.glow)} * ( exp( - vTall.y * 3.0 ) * ( 0.2 + 0.8 * facing * facing ) + 0.025 ) );` : ''}
	${o.rim ? `add += vec3( ${f(hot.r)}, ${f(hot.g)}, ${f(hot.b)} ) * ( ${f(o.rim)} * pow( 1.0 - facing, 2.5 ) * ( 0.35 + exp( - vTall.y * 2.0 ) ) );` : ''}
	totalEmissiveRadiance += add;
}`);
  };
  m.customProgramCacheKey = () => `${key.call(m)}|windows:${JSON.stringify(o)}`;
  return m;
}

// A path that wanders out from the middle: from one distance to another (or to the torn edge), setting out on a
// bearing and swaying about it by so many degrees, more the further out it is.
export function wander(deg: number, r0: number, r1: number | null, o: { sway?: number; wave?: number; phase?: number; step?: number; drift?: number } = {}): [number, number][] {
  const sway = o.sway ?? 6, wave = o.wave ?? 230, phase = o.phase ?? 0, step = o.step ?? 8, out: [number, number][] = [];
  const b = (r: number) => deg + (o.drift ?? 0) * ((r - r0) / 400) + sway * Math.min(1, (r - r0) / 120) * Math.sin((r / wave) * TAU + phase);
  for (let r = r0; ; r += step) {
    const end = r1 ?? EDGE.at(b(r)) - 1;
    if (r >= end) { out.push(at(b(end), end)); break; }
    out.push(at(b(r), r));
  }
  return out;
}
// How far a place on the map is from a path, and how far along the path the nearest point of it is.
export function off(path: [number, number][], x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
// A place on the map as a bearing and a distance.
export const polar = (x: number, z: number): [number, number] => [(Math.atan2(x, z) / D2R + 360) % 360, Math.hypot(x, z)];
// The matrix that stands something on the ground at a place on the map, facing a compass bearing (out from the
// middle unless one is given).
export function put(x: number, z: number, o: { face?: number; up?: number; lean?: number; scale?: number } = {}): THREE.Matrix4 {
  const [deg, r] = polar(x, z);
  return stand(deg, r, { up: o.up, lean: o.lean, scale: o.scale, turn: (o.face ?? deg) - deg });
}
// A path moved sideways by a distance that may change along it.
export function aside(path: [number, number][], d: (i: number) => number): [number, number][] {
  return path.map((p, i) => {
    const q = path[Math.min(path.length - 1, i + 1)], o = path[Math.max(0, i - 1)], dx = q[0] - o[0], dz = q[1] - o[1], l = Math.hypot(dx, dz) || 1;
    return [p[0] + (-dz / l) * d(i), p[1] + (dx / l) * d(i)] as [number, number];
  });
}
export const rect = (w: number, d: number, z = 0): Ring => [[w / 2, z + d / 2], [w / 2, z - d / 2], [-w / 2, z - d / 2], [-w / 2, z + d / 2]];
