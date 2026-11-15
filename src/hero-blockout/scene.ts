import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hex } from '../config/palette';
import type { Tier } from '../config/site';
import { slice } from '../world/build';
import { clock } from '../world/clock';
import { Stage } from '../world/stage';
import { finish, trueDarks } from '../world/tone';
import { surface } from './nets';
import { AVENUE, BOULEVARD, CORE, COURT, D2R, DISTRICTS, HOST, MOONWARD, PYRAMID, RIM, SPIRE, STREET, VIEW, WORLD, boulevards, city, debris, desert, dome, edge, ground, inland, noise, park, ramp, rock, seeded, type Building, type Piece } from './plan';

// Study 32: the stage the grey blockout of the hero's new world stands on. One low light, the moon, with real cast
// shadows, a little light from the sky, and the core's own light inside the torn hollow with shadows of its own. He
// ruled that shadows are what make it read as real, so the blockout is lit as the finished world will be and is
// plain grey otherwise: no material, no window, and no color but the core's and the lines of its light down the
// boulevards.

const M = 0.0015;
// The greys. Value is all that tells one thing from another here.
const GREY = { rock: 0.3, sand: 0.6, block: 0.41, street: 0.25, boulevard: 0.5, avenue: 0.55, park: 0.29, court: 0.5, building: 0.52, spire: 0.66, pyramid: 0.58, tree: 0.21 };
const CELL = 7;
// The rock's faces are flat and its skin is smooth: an edge sharper than this, in degrees, is kept as an edge.
const CREASE = 26;
const GLOW: Record<Tier, number> = { high: 2048, mid: 1024, low: 512, static: 2048 };
const LIGHT = { moon: 3, sky: 0.25, core: 0.34, lamp: 0.9, env: 0.05, line: 1.5 };
const SHADOW: Record<Tier, number> = { high: 4096, mid: 2048, low: 1024, static: 4096 };
const FADE = 0.04;

const grey = (v: number): THREE.Color => new THREE.Color(v, v * 0.975, v * 0.94);
const clay = (v: number, flat = false): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color: grey(v), roughness: 0.92, metalness: 0, flatShading: flat });
const up = new THREE.Vector3(0, 1, 0);
// Stands something built upright at the origin on the land at a place on the map, straight out from the planet,
// turned to its district's streets, and leaning toward where the land ends by so much.
function seat(x: number, z: number, lift = 0, turn = 0, lean = 0): THREE.Matrix4 {
  const n = new THREE.Vector3(x, WORLD.top + dome(x, z), z).normalize(), q = new THREE.Quaternion().setFromUnitVectors(up, n);
  if (lean) {
    const gx = inland(x + 6, z) - inland(x - 6, z), gz = inland(x, z + 6) - inland(x, z - 6), l = Math.hypot(gx, gz) || 1;
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-gz / l, 0, gx / l), lean));
  }
  if (turn) q.multiply(new THREE.Quaternion().setFromAxisAngle(up, -turn));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, ground(x, z), z).addScaledVector(n, lift), q, new THREE.Vector3(1, 1, 1));
}
const merged = (list: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const flat = list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; });
  const out = mergeGeometries(flat, false);
  for (const g of list) g.dispose();
  for (const g of flat) g.dispose();
  return out;
};

// The land: the top of the planet as one sheet, with the dunes in it. It carries how far inside the land's edge each
// point is, so the sheet is cut where the land ends and not along the squares it was measured on, and how much of
// each point is sand and how much park.
function landMesh(): THREE.BufferGeometry {
  const step = 4, half = 668, n = Math.round((2 * half) / step) + 1, pos: number[] = [], col: number[] = [], idx: number[] = [], keep: number[] = [], kind: number[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -half + i * step, z = -half + j * step, sand = desert(x, z), lawn = ramp(-0.03, 0.05, park(x, z));
    let v = GREY.block;
    v += (GREY.park * (0.86 + 0.3 * noise(x / 26, 7, z / 26, 71)) - v) * lawn;
    v += (GREY.sand - v) * sand;
    const c = grey(v);
    pos.push(x, ground(x, z), z);
    col.push(c.r, c.g, c.b);
    keep.push(edge(x, z));
    kind.push(sand, lawn);
  }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    if (Math.max(keep[a], keep[b], keep[c], keep[d]) > 0) idx.push(a, c, d, a, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aKeep', new THREE.Float32BufferAttribute(keep, 1));
  g.setAttribute('aLand', new THREE.Float32BufferAttribute(kind, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function edged<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aKeep;\nvarying float vKeep;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvKeep = aKeep;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vKeep;').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif ( vKeep < 0.0 ) discard;');
  };
  return m;
}
// The city's ground, drawn on the land where it is seen and not from the land's own points, so a street is sharp
// however it lies: each district's streets at its own angle, the boulevards where two districts meet, the avenue,
// the two courts, and a line of the stream's light down the middle of every boulevard.
function paved(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 }), lines = boulevards(), f = (v: number) => v.toFixed(3);
  const uniforms = {
    uDistrict: { value: DISTRICTS.map((d) => new THREE.Vector4(d.x, d.z, Math.cos(d.turn * D2R), Math.sin(d.turn * D2R))) },
    uPitch: { value: DISTRICTS.map((d) => d.pitch) },
    uLine: { value: lines.map((l) => new THREE.Vector4(l[0], l[1], l[2], l[3])) },
    uHot: { value: new THREE.Color(hex('hot')).multiplyScalar(LIGHT.line) },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aKeep;\nattribute vec2 aLand;\nvarying float vKeep;\nvarying vec2 vLand;\nvarying vec2 vMap;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKeep = aKeep;\nvLand = aLand;\nvMap = position.xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vKeep;
varying vec2 vLand;
varying vec2 vMap;
uniform vec4 uDistrict[ ${DISTRICTS.length} ];
uniform float uPitch[ ${DISTRICTS.length} ];
uniform vec4 uLine[ ${lines.length} ];
uniform vec3 uHot;
float gLine = 0.0;
float band( float d, float w, float aa ) { return 1.0 - smoothstep( w - aa, w + aa, d ); }`)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif ( vKeep < 0.0 ) discard;')
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 m = vMap;
  float aa = clamp( 0.75 * ( fwidth( m.x ) + fwidth( m.y ) ), 0.35, 6.0 );
  float best = 1e12, pitch = uPitch[ 0 ];
  vec4 mine = uDistrict[ 0 ];
  for ( int i = 0; i < ${DISTRICTS.length}; i ++ ) { vec2 q = m - uDistrict[ i ].xy; float d = dot( q, q ); if ( d < best ) { best = d; mine = uDistrict[ i ]; pitch = uPitch[ i ]; } }
  vec2 q = m - mine.xy, uv = vec2( q.x * mine.z + q.y * mine.w, - q.x * mine.w + q.y * mine.z ) / pitch, g = abs( uv - floor( uv + 0.5 ) ) * pitch;
  float spire = band( length( m ), ${f(COURT)}, aa ), court = max( spire, band( length( m - vec2( ${f(PYRAMID.x)}, ${f(PYRAMID.z)} ) ), ${f(PYRAMID.court)}, aa ) );
  float sand = vLand.x, open = ( 1.0 - sand ) * ( 1.0 - court );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( ${f(GREY.street)}, ${f(GREY.street * 0.975)}, ${f(GREY.street * 0.94)} ), band( min( g.x, g.y ), ${f(STREET)}, aa ) * open * ( 1.0 - vLand.y ) * ( 1.0 - 0.6 * smoothstep( 1.5, 5.0, aa ) ) );
  float road = 1e9;
  for ( int i = 0; i < ${lines.length}; i ++ ) { vec2 a = uLine[ i ].xy, e = uLine[ i ].zw - a; road = min( road, length( m - a - e * clamp( dot( m - a, e ) / dot( e, e ), 0.0, 1.0 ) ) ); }
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( ${f(GREY.boulevard)}, ${f(GREY.boulevard * 0.975)}, ${f(GREY.boulevard * 0.94)} ), band( road, ${f(BOULEVARD)}, aa ) * open );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( ${f(GREY.court)}, ${f(GREY.court * 0.975)}, ${f(GREY.court * 0.94)} ), court );
  float way = m.y > ${f(AVENUE.from)} ? abs( m.x ) : 1e9;
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( ${f(GREY.avenue)}, ${f(GREY.avenue * 0.975)}, ${f(GREY.avenue * 0.94)} ), band( way, ${f(AVENUE.half)}, aa ) * ( 1.0 - spire ) );
  gLine = max( band( road, 1.1, min( aa, 1.4 ) ) * open, band( way, 1.7, min( aa, 1.4 ) ) * ( 1.0 - spire ) ) * min( 1.0, 1.2 / aa );
}`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uHot * gLine;');
  };
  return m;
}

function spire(): THREE.BufferGeometry {
  const H = SPIRE.tall, f = SPIRE.foot;
  const profile: [number, number][] = [[f, 0], [f, 7], [f * 0.74, 7], [f * 0.74, 16], [f * 0.56, 23], [f * 0.42, 0.19 * H], [f * 0.32, 0.43 * H], [f * 0.23, 0.7 * H], [f * 0.14, 0.86 * H], [f * 0.085, 0.88 * H], [f * 0.04, 0.91 * H], [0.9, H], [0, H]];
  const parts: THREE.BufferGeometry[] = [new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 28)];
  for (const k of [0.3, 0.52, 0.71]) {
    const r = f * (k < 0.43 ? 0.42 + (0.32 - 0.42) * ((k - 0.19) / 0.24) : 0.32 + (0.23 - 0.32) * ((k - 0.43) / 0.27)) + 2.6;
    parts.push(new THREE.CylinderGeometry(r, r + 0.8, 3.4, 28).translate(0, k * H, 0));
  }
  const ring = new THREE.TorusGeometry(SPIRE.ring.r, SPIRE.ring.thick, 10, 96).rotateX(Math.PI / 2);
  ring.applyMatrix4(new THREE.Matrix4().makeTranslation(0, SPIRE.ring.up * H, 0).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(SPIRE.ring.tilt[0] * D2R, 0, SPIRE.ring.tilt[1] * D2R))));
  parts.push(ring);
  return merged(parts);
}

// A building as plain forms: a size, a place and a silhouette, and no style.
function built(b: Building, r: () => number): THREE.BufferGeometry[] {
  const w = b.w, d = b.d, h = b.tall;
  const box = (bw: number, bh: number, bd: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(bw, bh, bd).translate(x, y + bh / 2, z);
  const rod = (rad: number, bh: number, x: number, z: number) => new THREE.CylinderGeometry(rad * 0.82, rad, bh, 16).translate(x, bh / 2, z);
  switch (b.form) {
    case 'tier': return [box(w, h * 0.62, d), box(w * 0.64, h * 0.38, d * 0.64, 0, h * 0.62)];
    case 'step': return [box(w, h * 0.46, d), box(w * 0.74, h * 0.3, d * 0.74, 0, h * 0.46), box(w * 0.5, h * 0.18, d * 0.5, 0, h * 0.76), new THREE.CylinderGeometry(0.7, 1.3, h * 0.1, 6).translate(0, h * 0.99, 0)];
    case 'taper': {
      const t = new THREE.CylinderGeometry(0.5 * Math.SQRT2 * 0.72, 0.5 * Math.SQRT2, 1, 4, 1).rotateY(Math.PI / 4).scale(w, h * 0.93, d).translate(0, h * 0.465, 0).toNonIndexed();
      t.computeVertexNormals();
      return [t, box(w * 0.42, h * 0.07, d * 0.42, 0, h * 0.93)];
    }
    case 'drum': return [new THREE.CylinderGeometry(w * 0.46, w * 0.5, h * 0.8, 28).translate(0, h * 0.4, 0), new THREE.CylinderGeometry(w * 0.57, w * 0.55, h * 0.02, 32).translate(0, h * 0.83, 0), new THREE.CylinderGeometry(w * 0.28, w * 0.38, h * 0.17, 24).translate(0, h * 0.915, 0)];
    case 'blade': {
      const g = new THREE.BoxGeometry(w, h, d * 0.46).translate(0, h / 2, 0), p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) if (p.getY(i) > h * 0.5 && p.getX(i) > 0) p.setY(i, h * 0.82);
      g.computeVertexNormals();
      return [g, box(w * 1.06, h * 0.09, d * 0.74)];
    }
    case 'twin': return [box(w * 0.38, h, d * 0.72, -w * 0.31), box(w * 0.38, h * 0.84, d * 0.72, w * 0.31), box(w * 0.3, h * 0.05, d * 0.4, 0, h * 0.58), box(w, h * 0.1, d)];
    case 'needles': return [box(w, h * 0.14, d), rod(w * 0.19, h, -w * 0.2, -d * 0.16), rod(w * 0.19, h * 0.8, w * 0.22, -d * 0.1), rod(w * 0.19, h * 0.62, 0, d * 0.24)];
    default: return r() < 0.35 && h > 16 ? [box(w, h, d), box(w * 0.5, Math.max(1.5, h * 0.08), d * 0.5, 0, h)] : [box(w, h, d)];
  }
}

// A broken piece: the smallest solid that holds a handful of points, so every face of it is flat. Long one way, and
// narrower at one end.
function shard(long: number, r: () => number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [], n = 9 + Math.floor(r() * 6);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), k = 0.62 + 0.38 * r(), thin = 1 - 0.55 * (u * 0.5 + 0.5);
    pts.push(new THREE.Vector3(s * Math.cos(a) * k * thin, u * k * long, s * Math.sin(a) * k * thin));
  }
  return new ConvexGeometry(pts);
}
// A great piece that still carries a piece of the land: flat on top, torn underneath. It gives the rock, the land on
// it, and what stands there.
function slab(p: Piece, r: () => number): { rock: THREE.BufferGeometry; top: THREE.BufferGeometry; on: THREE.BufferGeometry[]; trees: THREE.Matrix4[] } {
  const rim: THREE.Vector3[] = [], pts: THREE.Vector3[] = [], m = 9;
  for (let i = 0; i < m; i++) { const a = ((i + 0.6 * r()) / m) * Math.PI * 2, k = 0.74 + 0.26 * r(); rim.push(new THREE.Vector3(Math.cos(a) * k, 0, Math.sin(a) * k)); }
  pts.push(...rim);
  for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2, k = 0.46 + 0.34 * r(); pts.push(new THREE.Vector3(Math.cos(a) * k, -(0.3 + 0.25 * r()), Math.sin(a) * k)); }
  for (let i = 0; i < 3; i++) { const a = r() * Math.PI * 2, k = 0.26 * r(); pts.push(new THREE.Vector3(Math.cos(a) * k, -(0.85 + 0.5 * r()), Math.sin(a) * k)); }
  const to = new THREE.Matrix4().compose(new THREE.Vector3(...p.at), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.5)), new THREE.Vector3(p.r, p.r, p.r));
  const fan: number[] = [];
  for (let i = 0; i < m; i++) { const a = rim[i], b = rim[(i + 1) % m]; fan.push(0, 0.012, 0, b.x * 0.97, 0.012, b.z * 0.97, a.x * 0.97, 0.012, a.z * 0.97); }
  const top = new THREE.BufferGeometry();
  top.setAttribute('position', new THREE.Float32BufferAttribute(fan, 3));
  top.computeVertexNormals();
  const on: THREE.BufferGeometry[] = [], trees: THREE.Matrix4[] = [];
  if (p.land !== 'sand') {
    for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2, k = 0.5 * Math.sqrt(r()), bw = 0.1 + 0.08 * r(), bh = 0.14 + 0.5 * r() * (1 - k); on.push(new THREE.BoxGeometry(bw, bh, bw).translate(Math.cos(a) * k, 0.012 + bh / 2, Math.sin(a) * k).applyMatrix4(to)); }
    for (let i = 0; i < 5; i++) { const a = r() * Math.PI * 2, k = 0.3 + 0.36 * r(); trees.push(to.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * k, 0.07, Math.sin(a) * k), new THREE.Quaternion(), new THREE.Vector3(0.07, 0.06, 0.07)))); }
  }
  return { rock: new ConvexGeometry(pts).applyMatrix4(to), top: top.applyMatrix4(to), on, trees };
}

export interface Blockout {
  // Looks from so many degrees above.
  view(el: number): void;
  // The cursor's light, as places across and down the host, 0 to 1.
  lamp(x: number, y: number): void;
  dispose(): void;
}

export async function mountBlockout(host: HTMLElement, tier: Tier, el: number): Promise<Blockout> {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.prepend(canvas);
  const stage = new Stage(host, canvas, { tier, fov: 8, near: 0.3, far: 40, bloom: { strength: 0.16, threshold: 1.6, radius: 0.4 }, ao: 0.03, aoIntensity: 1, aoSamples: 12, aoScale: 0.5, bloomScale: 0.5, envIntensity: LIGHT.env, env: 'studio', lampAngle: 0.9 });
  trueDarks(stage.renderer);
  finish(stage, FADE);
  const s = stage.scene, root = new THREE.Group(), r = seeded(9041);
  root.scale.setScalar(M);
  s.add(root);
  const add = (g: THREE.BufferGeometry, m: THREE.Material, cast = true): THREE.Mesh => {
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    return mesh;
  };

  // What is left of the planet's body, from the description of it.
  const span = WORLD.half + 34, low = RIM + WORLD.deep + 34;
  const body = await surface(rock, [-span, -low, -span], [Math.ceil((2 * span) / CELL), Math.ceil((low + 76) / CELL), Math.ceil((2 * span) / CELL)], CELL, CREASE * D2R);
  add(body, clay(GREY.rock));
  await slice();
  add(landMesh(), paved()).customDepthMaterial = edged(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
  await slice();

  // What stands on it.
  const { buildings, trees } = city(), forms: THREE.BufferGeometry[] = [], crowns: THREE.Matrix4[] = [];
  for (const b of buildings) { const to = seat(b.x, b.z, 0, b.turn, b.lean); for (const g of built(b, r)) forms.push(g.applyMatrix4(to)); }
  for (const t of trees) crowns.push(seat(t.x, t.z, t.size * 0.86).multiply(new THREE.Matrix4().makeScale(t.size, t.size * 0.84, t.size)));
  await slice();
  add(spire(), clay(GREY.spire));
  const pyr = seat(PYRAMID.x, PYRAMID.z, 2);
  add(merged([
    new THREE.ConeGeometry(PYRAMID.base / Math.SQRT2, PYRAMID.tall, 4).rotateY(Math.PI / 4).translate(0, PYRAMID.tall / 2, 0).applyMatrix4(pyr),
    new THREE.BoxGeometry(PYRAMID.base + 26, 4, PYRAMID.base + 26).translate(0, -1, 0).applyMatrix4(pyr),
  ]), clay(GREY.pyramid, true));

  // What broke away.
  const chunks: THREE.BufferGeometry[] = [], city0: THREE.BufferGeometry[] = [], sand0: THREE.BufferGeometry[] = [], q = new THREE.Quaternion(), v = new THREE.Vector3();
  for (const p of debris()) {
    if (p.kind === 'slab') {
      const made = slab(p, r);
      chunks.push(made.rock);
      (p.land === 'sand' ? sand0 : city0).push(made.top);
      forms.push(...made.on);
      crowns.push(...made.trees);
      continue;
    }
    // A locked piece keeps its narrow end to the core. One in orbit lies along its way round. A small one tumbles.
    if (p.kind === 'locked') q.setFromUnitVectors(up, v.set(CORE.at[0] - p.at[0], CORE.at[1] - p.at[1], CORE.at[2] - p.at[2]).normalize());
    else if (p.kind === 'orbit') q.setFromUnitVectors(up, v.set(p.at[2], 0.3 * (r() - 0.5) * Math.hypot(p.at[0], p.at[2]), -p.at[0]).normalize());
    else q.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6));
    chunks.push(shard(p.long, r).applyMatrix4(new THREE.Matrix4().compose(v.set(...p.at), q, new THREE.Vector3(p.r, p.r, p.r))));
  }
  add(merged(forms), clay(GREY.building));
  add(merged(chunks), clay(GREY.rock, true));
  add(merged(city0), clay(GREY.block, true));
  add(merged(sand0), clay(GREY.sand, true));
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), clay(GREY.tree, true), crowns.length);
  crowns.forEach((m, i) => leaves.setMatrixAt(i, m));
  leaves.castShadow = leaves.receiveShadow = true;
  root.add(leaves);
  await slice();

  // The core and the stream: the one colored thing. Its light is in the hollow, with shadows of its own.
  const hot = new THREE.Color(hex('hot')), fire = new THREE.MeshBasicMaterial({ color: hot.clone().multiplyScalar(2.6) });
  // A ball and not a disc: brightest where it faces the eye.
  const ball = new THREE.ShaderMaterial({
    uniforms: { uHot: { value: hot } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 p = modelViewMatrix * vec4( position, 1.0 ); vN = normalMatrix * normal; vV = - p.xyz; gl_Position = projectionMatrix * p; }',
    fragmentShader: 'uniform vec3 uHot; varying vec3 vN; varying vec3 vV; void main() { float k = max( 0.0, dot( normalize( vN ), normalize( vV ) ) ); gl_FragColor = vec4( uHot * ( 0.9 + 2.6 * k * k ), 1.0 ); }',
  });
  add(new THREE.SphereGeometry(CORE.r, 40, 24).translate(...CORE.at), ball, false).receiveShadow = false;
  const fall = 900;
  add(new THREE.CylinderGeometry(3.4, 2, fall, 10).translate(CORE.at[0], CORE.at[1] - CORE.r - fall / 2 + 8, CORE.at[2]), fire, false).receiveShadow = false;
  const glow = new THREE.PointLight(hot, LIGHT.core, 0, 2);
  glow.position.set(...CORE.at).multiplyScalar(M);
  glow.castShadow = true;
  glow.shadow.mapSize.setScalar(GLOW[tier]);
  glow.shadow.camera.near = 0.02;
  glow.shadow.camera.far = 3;
  glow.shadow.bias = -0.003;
  glow.shadow.autoUpdate = false;
  s.add(glow);

  const moon = new THREE.DirectionalLight(hex('pale'), LIGHT.moon), reach = 980 * M;
  moon.castShadow = true;
  moon.shadow.mapSize.setScalar(SHADOW[tier]);
  Object.assign(moon.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.5, far: 9 });
  moon.shadow.bias = -0.0003;
  moon.shadow.normalBias = 0.0016;
  moon.shadow.autoUpdate = false;
  s.add(moon, moon.target, new THREE.HemisphereLight(0x9a948c, 0x1a1714, LIGHT.sky));
  stage.lamp.intensity = LIGHT.lamp;
  stage.lamp.castShadow = false;

  let lampUV = { x: 0.6, y: 0.3 }, alive = true, seen = true, stale = true, drawn = 0;
  const aim = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3(), back = new THREE.Vector3();
  const place = () => {
    const cam = stage.camera, e = el * D2R, d = VIEW.back * M;
    // The spire's tip keeps its place in the host whatever the view.
    aim.set(0, (SPIRE.tall - (HOST.tall / 2 - HOST.over) / Math.cos(e)) * M, 0);
    cam.fov = (2 * Math.atan((HOST.tall * M) / (2 * d))) / D2R;
    cam.aspect = stage.width / Math.max(1, stage.height);
    cam.position.set(aim.x, aim.y + d * Math.sin(e), aim.z + d * Math.cos(e));
    cam.lookAt(aim);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    cam.matrixWorld.extractBasis(right, upv, back);
    const mid = new THREE.Vector3(0, -420 * M, 0);
    moon.target.position.copy(mid);
    moon.position.set(...MOONWARD).normalize().multiplyScalar(4.5).add(mid);
    stage.lamp.position.copy(aim).addScaledVector(right, (lampUV.x - 0.5) * 2.2).addScaledVector(upv, (0.5 - lampUV.y) * 2.2).addScaledVector(back, 2.6);
    stage.lamp.target.position.copy(aim);
  };
  const frame = () => {
    if (!alive || !seen || !stale) return;
    stale = false;
    place();
    if (drawn < 3 || clock.isFrozen()) { moon.shadow.needsUpdate = true; glow.shadow.needsUpdate = true; }
    drawn++;
    stage.render();
    if (drawn < 3) stale = true;
  };
  stage.resize();
  place();
  await stage.warm();
  const watch = new ResizeObserver(() => { stage.resize(); stale = true; frame(); });
  watch.observe(host);
  const near = new IntersectionObserver((es) => { seen = es.some((x) => x.isIntersecting); if (seen) { stale = true; frame(); } });
  near.observe(host);
  const off = clock.onFrame(frame);
  frame();

  return {
    view(to) { el = to; stale = true; frame(); },
    lamp(x, y) { if (Math.abs(x - lampUV.x) + Math.abs(y - lampUV.y) < 0.004) return; lampUV = { x, y }; stale = true; },
    dispose() { alive = false; off(); watch.disconnect(); near.disconnect(); stage.dispose(); canvas.remove(); },
  };
}
