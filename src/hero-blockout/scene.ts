import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hex } from '../config/palette';
import type { Tier } from '../config/site';
import { clock } from '../world/clock';
import { Stage } from '../world/stage';
import { finish, trueDarks } from '../world/tone';
import { surface } from './nets';
import { AVENUE, BLOCK, CORE, D2R, DEBRIS, HOST, MOONWARD, PYRAMID, SPIRE, VIEW, WORLD, desert, dome, ground, inland, lots, noise, rock, seeded, standing } from './plan';

// Study 32: the stage the grey blockout of the hero's new world stands on. One low light, the moon, with real cast
// shadows, a little light from the sky, and the core's own light inside the torn hollow with shadows of its own. He
// ruled that shadows are what make it read as real, so the blockout is lit as the finished world will be and is
// plain grey otherwise: no material, no window, no color but the core's.

const M = 0.0015;
// The greys. Value is all that tells one thing from another here.
const GREY = { rock: 0.3, sand: 0.6, block: 0.4, street: 0.28, avenue: 0.5, park: 0.33, court: 0.48, building: 0.5, spire: 0.64, pyramid: 0.57, tree: 0.24 };
const CELL = 7;
// The rock's faces are flat and its skin is smooth: an edge sharper than this, in degrees, is kept as an edge.
const CREASE = 34;
const LIGHT = { moon: 3, sky: 0.2, core: 0.3, lamp: 0.9, env: 0.05 };
const SHADOW: Record<Tier, number> = { high: 4096, mid: 2048, low: 1024, static: 4096 };
const RIM = 0.04;

const grey = (v: number): THREE.Color => new THREE.Color(v, v * 0.975, v * 0.94);
const clay = (v: number, flat = false): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color: grey(v), roughness: 0.92, metalness: 0, flatShading: flat });
// Stands something built upright at the origin on the land at a place on the map, straight out from the planet.
const up = new THREE.Vector3(0, 1, 0);
function seat(x: number, z: number, lift = 0, turn = 0): THREE.Matrix4 {
  const n = new THREE.Vector3(x, WORLD.top + dome(x, z), z).normalize(), q = new THREE.Quaternion().setFromUnitVectors(up, n);
  if (turn) q.multiply(new THREE.Quaternion().setFromAxisAngle(up, turn));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, ground(x, z), z).addScaledVector(n, lift), q, new THREE.Vector3(1, 1, 1));
}
const merged = (list: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const flat = list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; });
  const out = mergeGeometries(flat, false);
  for (const g of list) g.dispose();
  for (const g of flat) g.dispose();
  return out;
};

// The land: the top of the planet as one sheet, with the dunes in it, cut off at the rim and where it was torn.
function landMesh(): THREE.BufferGeometry {
  const step = 4, half = 668, n = Math.round((2 * half) / step) + 1, pos: number[] = [], col: number[] = [], idx: number[] = [], keep: number[] = [];
  const street = (v: number) => Math.abs(((((v - BLOCK / 2) % BLOCK) + BLOCK) % BLOCK + BLOCK / 2) % BLOCK - BLOCK / 2) < 8;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -half + i * step, z = -half + j * step, sand = desert(x, z), far = Math.hypot(x, z);
    let v = street(x) || street(z - 6) ? GREY.street : GREY.block;
    if (Math.abs(x) < AVENUE.half && z > 30) v = GREY.avenue;
    if (far < 76 || Math.hypot(x - PYRAMID.x, z - PYRAMID.z) < PYRAMID.court) v = GREY.court;
    v += (GREY.sand - v) * sand;
    const c = grey(v);
    pos.push(x, ground(x, z), z);
    col.push(c.r, c.g, c.b);
    keep.push(inland(x, z));
  }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    if (Math.max(keep[a], keep[b], keep[c], keep[d]) > 0) idx.push(a, c, d, a, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aKeep', new THREE.Float32BufferAttribute(keep, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// The land's edge is drawn where the land ends and not along the squares it was measured on: what lies off it is
// left undrawn, and casts no shadow.
function edged<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aKeep;\nvarying float vKeep;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvKeep = aKeep;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vKeep;').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif ( vKeep < 0.0 ) discard;');
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
  finish(stage, RIM);
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

  // The planet's body, with its torn hollow, from the description of it.
  const span = WORLD.half + 34, body = await surface(rock, [-span, -(WORLD.deep + 150), -span], [Math.ceil((2 * span) / CELL), Math.ceil((WORLD.deep + 170) / CELL), Math.ceil((2 * span) / CELL)], CELL, CREASE * D2R);
  add(body, clay(GREY.rock));
  add(landMesh(), edged(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 }))).customDepthMaterial = edged(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));

  // What stands on it.
  const towers: THREE.BufferGeometry[] = [], trees: THREE.Matrix4[] = [];
  const tree = (x: number, z: number, size: number) => { if (standing(x, z, 8) && desert(x, z) < 0.3) trees.push(seat(x, z, size * 0.9).multiply(new THREE.Matrix4().makeScale(size, size * 0.82, size))); };
  for (const l of lots()) {
    if (l.kind === 'park') { for (let i = 0; i < 11; i++) tree(l.x + (r() - 0.5) * 54, l.z + (r() - 0.5) * 54, 7 + 4 * r()); continue; }
    const to = seat(l.x, l.z), h = l.tall;
    if (l.kind === 'drum') {
      towers.push(new THREE.CylinderGeometry(l.w * 0.5, l.w * 0.53, h * 0.8, 24).translate(0, h * 0.4, 0).applyMatrix4(to));
      towers.push(new THREE.CylinderGeometry(l.w * 0.33, l.w * 0.4, h * 0.2, 24).translate(0, h * 0.9, 0).applyMatrix4(to));
      continue;
    }
    if (l.kind === 'low') { towers.push(new THREE.BoxGeometry(l.w, h, l.d).translate(0, h / 2, 0).applyMatrix4(to)); continue; }
    // A plain tapering block with a crown: a size and a place, and no style.
    const taper = new THREE.CylinderGeometry(0.5 * Math.SQRT2 * 0.8, 0.5 * Math.SQRT2, 1, 4, 1).rotateY(Math.PI / 4).scale(l.w, h * 0.93, l.d).translate(0, h * 0.465, 0).toNonIndexed();
    taper.computeVertexNormals();
    towers.push(taper.applyMatrix4(to));
    towers.push(new THREE.BoxGeometry(l.w * 0.5, h * 0.07, l.d * 0.5).translate(0, h * 0.965, 0).applyMatrix4(to));
  }
  add(merged(towers), clay(GREY.building));
  add(spire(), clay(GREY.spire));
  const pyr = seat(PYRAMID.x, PYRAMID.z, 2);
  add(merged([
    new THREE.ConeGeometry(PYRAMID.base / Math.SQRT2, PYRAMID.tall, 4).rotateY(Math.PI / 4).translate(0, PYRAMID.tall / 2, 0).applyMatrix4(pyr),
    new THREE.BoxGeometry(PYRAMID.base + 26, 4, PYRAMID.base + 26).translate(0, -1, 0).applyMatrix4(pyr),
  ]), clay(GREY.pyramid, true));
  // Trees: down both sides of the avenue, round the pyramid's court, and along the city's edge by the desert.
  for (let z = AVENUE.from + 18; z < 560; z += 21) for (const side of [-1, 1]) tree(side * (AVENUE.half + 9), z, 8.5);
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; tree(PYRAMID.x + Math.sin(a) * (PYRAMID.court - 10), PYRAMID.z + Math.cos(a) * (PYRAMID.court - 10), 8); }
  for (let z = -560; z < 600; z += 13) for (let x = -200; x < 560; x += 9) { const d = desert(x, z); if (d > 0.02 && d < 0.12 && r() < 0.5) { tree(x, z, 7 + 4 * r()); break; } }
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), clay(GREY.tree, true), trees.length);
  trees.forEach((m, i) => leaves.setMatrixAt(i, m));
  leaves.castShadow = leaves.receiveShadow = true;
  root.add(leaves);

  // What broke away. The large pieces still carry a piece of the land.
  const chunks: THREE.BufferGeometry[] = [], tops: THREE.BufferGeometry[] = [];
  for (const d of DEBRIS) {
    const g = new THREE.IcosahedronGeometry(1, 2), p = g.getAttribute('position'), sx = 0.8 + 0.5 * r(), sy = 0.55 + 0.4 * r(), sz = 0.8 + 0.5 * r(), seed = Math.floor(r() * 99);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.62 + 0.75 * noise(x * 1.7 + 9, y * 1.7 + 9, z * 1.7 + 9, seed);
      p.setXYZ(i, x * k * sx, d.land ? Math.min(y * k * sy, 0.3) : y * k * sy, z * k * sz);
    }
    const to = new THREE.Matrix4().compose(new THREE.Vector3(...d.at), new THREE.Quaternion().setFromEuler(new THREE.Euler(d.land ? 0.14 * (r() - 0.5) : r() * 6, r() * 6, d.land ? 0.3 * (r() - 0.5) : r() * 6)), new THREE.Vector3(d.r, d.r, d.r));
    chunks.push(g.applyMatrix4(to));
    if (!d.land) continue;
    tops.push(new THREE.CylinderGeometry(0.62, 0.66, 0.03, 20).scale(sx, 1, sz).translate(0, 0.31, 0).applyMatrix4(to));
    for (const [bx, bz, bh] of [[-0.18, 0.05, 0.62], [0.12, -0.14, 0.44], [0.2, 0.2, 0.3]]) tops.push(new THREE.BoxGeometry(0.2, bh, 0.2).translate(bx, 0.32 + bh / 2, bz).applyMatrix4(to));
  }
  add(merged(chunks), clay(GREY.rock, true));
  add(merged(tops), clay(GREY.building));

  // The core and the stream: the one colored thing. Its light is in the hollow, with shadows of its own.
  const hot = new THREE.Color(hex('hot')), fire = new THREE.MeshBasicMaterial({ color: hot.clone().multiplyScalar(2.6) });
  // A ball and not a disc: brightest where it faces the eye.
  const ball = new THREE.ShaderMaterial({
    uniforms: { uHot: { value: hot } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 p = modelViewMatrix * vec4( position, 1.0 ); vN = normalMatrix * normal; vV = - p.xyz; gl_Position = projectionMatrix * p; }',
    fragmentShader: 'uniform vec3 uHot; varying vec3 vN; varying vec3 vV; void main() { float k = max( 0.0, dot( normalize( vN ), normalize( vV ) ) ); gl_FragColor = vec4( uHot * ( 0.9 + 2.6 * k * k ), 1.0 ); }',
  });
  add(new THREE.SphereGeometry(CORE.r, 40, 24).translate(...CORE.at), ball, false).receiveShadow = false;
  add(new THREE.CylinderGeometry(3.4, 2.2, 760, 10).translate(CORE.at[0], CORE.at[1] - CORE.r - 372, CORE.at[2]), fire, false).receiveShadow = false;
  const glow = new THREE.PointLight(hot, LIGHT.core, 0, 2);
  glow.position.set(...CORE.at).multiplyScalar(M);
  glow.castShadow = true;
  glow.shadow.mapSize.setScalar(1024);
  glow.shadow.camera.near = 0.02;
  glow.shadow.camera.far = 3;
  glow.shadow.bias = -0.003;
  glow.shadow.autoUpdate = false;
  s.add(glow);

  const moon = new THREE.DirectionalLight(hex('pale'), LIGHT.moon), reach = 860 * M;
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
    const mid = new THREE.Vector3(0, -260 * M, 0);
    moon.target.position.copy(mid);
    moon.position.set(...MOONWARD).normalize().multiplyScalar(4.5).add(mid);
    stage.lamp.position.copy(aim).addScaledVector(right, (lampUV.x - 0.5) * 2.2).addScaledVector(upv, (0.5 - lampUV.y) * 1.9).addScaledVector(back, 2.6);
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
