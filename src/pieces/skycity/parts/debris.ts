import * as THREE from 'three';
import { seeded, slice } from '../../../world/build';
import { DEBRIS, HEART, SOURCE, TEAR, VIEW } from '../layout';
import type { CityPart, PartFactory } from '../part';
import { CHUNK_WEIGHT, FRAGMENT_WEIGHT, type Kind, chunkKinds, fragmentKinds, pick } from './debris/chunks';
import type { V3 } from './debris/hull';
import { type LookUniforms, lookDepth, lookMaterial } from './debris/look';
import { MODE, MOVE_ATTRS, type Move, type Ring, SMALL, clearAlways, eddy, hold, moveAt, orbit, packMove, tumble } from './debris/motion';
import { CLEAR_SHARE, type Shard, type ShardUniforms, bake, riderSize, shardMaterials, shardTriangles } from './debris/shards';
import { SLABS, SLAB_NAMES } from './debris/slabs';
import { occlusion } from './debris/ao';

// What broke away when the planet was torn: pieces of it round the torn underside and under it, from great slabs
// with a length of street or a building still on them, through chunks of its rock, down to fragments and, smallest,
// the stream's own shards, thickest round the stream's fall. Some go round the world's upright in slow rings that
// pass in front of the torn rock and behind it, some hold their place with one face to the core, some tumble where
// they are. All of it moves in its shaders from the clock (./debris/motion.ts).
//
// ?slab=canyon (or colonnade, peak, grove, tower, pylon, block) with ?only=debris shows that slab alone and
// close, held still and turned to show its top, and ?turn=40 turns it that many degrees about its upright.

const TAU = Math.PI * 2;
// Heights are given from the core's middle: the frame's numbers can move and the field moves with them.
const Y = HEART[1];

// How many of each, by the stage's tier.
const COUNT = { chunks: 50, fragments: 340, shards: 380, eddy: 0.8 };
// The rings round the world's upright: the outer ones pass in front of the torn rock and round behind the world,
// under the core's disc where they cross it. The inner ones run under the torn rock, behind the core's foot.
const OUTER = { r: [700, 960], y: [Y + 85, Y - 125], dip: [0.04, 0.2], om: [0.008, 0.02] };
const INNER = { r: [250, 640], y: [TEAR.low - 8, TEAR.low - 36], om: [0.018, 0.045] };
// Under the core, round the stream's fall: how far out, how low, and how fast round.
const FALL = { r: [12, 140], top: Y - 197, foot: DEBRIS.low + 8, om: [0.09, 0.32] };
// How far the rays that find a piece's own corners reach: on a slab in units, on a chunk in its own size.
const OCC = { slab: 7, chunk: 0.35 };
// The share of the fragments that broke off with a larger piece and keep near it.
const TRAIL = 0.4;
// How fast things tumble, by size: radians a second.
const SPIN = { slab: [0.025, 0.05], chunk: [0.07, 0.26], fragment: [0.2, 0.6], shard: [0.3, 0.9] };

// The great slabs, each put by hand: where, and how it moves.
interface SlabPlan { name: (typeof SLAB_NAMES)[number]; how: 'hold' | 'tumble' | 'orbit'; at?: V3; ring?: Ring; th0?: number; face?: V3; spin?: number }
const PLAN: SlabPlan[] = [
  { name: 'pylon', how: 'hold', at: [-660, Y + 40, 450], face: [0, -1, 0] },
  { name: 'grove', how: 'hold', at: [-560, Y - 90, 690], face: [0, 0, -1] },
  { name: 'canyon', how: 'hold', at: [610, Y + 50, 450], face: [0, 0, -1] },
  { name: 'tower', how: 'tumble', at: [620, Y - 110, 640], spin: 0.04 },
  { name: 'peak', how: 'orbit', ring: { r: 820, y: Y - 60, dip: 0.12, lean: -0.02, om: 0.011 }, th0: 2.3 },
  { name: 'block', how: 'orbit', ring: { r: 880, y: Y - 60, dip: 0.1, lean: 0.02, om: 0.0095 }, th0: 0.95 },
  { name: 'colonnade', how: 'orbit', ring: { r: 770, y: Y - 115, dip: 0.06, lean: -0.03, om: -0.013 }, th0: 2.15 },
];

const lerp = (a: readonly number[], t: number) => a[0] + (a[1] - a[0]) * t;
const eye = new THREE.Vector3(0, Math.sin((VIEW.el * Math.PI) / 180), Math.cos((VIEW.el * Math.PI) / 180));

// Holding its face to the core, turned about that face so as much of its top as can be is toward the visitor.
function holdShowing(at: V3, face: V3, r: () => number, o: { scale: number; seed: number }): Move {
  let best = 0, most = -Infinity;
  for (let i = 0; i < 36; i++) {
    const m = hold(at, face, (i / 36) * TAU, r, o), q = new THREE.Quaternion(...m.q0);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q).dot(eye);
    if (up > most) { most = up; best = i; }
  }
  return hold(at, face, (best / 36) * TAU, r, o);
}

function instanced(src: THREE.BufferGeometry, moves: Move[]): THREE.InstancedBufferGeometry {
  const g = new THREE.InstancedBufferGeometry();
  for (const name of ['position', 'normal', 'cell', 'occ']) g.setAttribute(name, src.getAttribute(name));
  const packed = moves.map(packMove);
  MOVE_ATTRS.forEach((n, i) => g.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(packed.flatMap((p) => p[i])), 4)));
  g.instanceCount = moves.length;
  return g;
}

export const build: PartFactory = async ({ tier }) => {
  const q = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);
  const only = q.get('only') === 'debris' ? q.get('slab') : null, turnDeg = Number(q.get('turn') ?? 0);
  const k = tier === 'low' ? 0.55 : tier === 'mid' ? 0.8 : 1;
  const u: LookUniforms = { uT: { value: 0 }, uCore: { value: 1 } };
  const su: ShardUniforms = { uT: u.uT, uCore: u.uCore, uEye: { value: eye.clone().multiplyScalar(1e5) }, uLamp: { value: new THREE.Vector3() }, uLampI: { value: 0.75 }, uDpr: { value: typeof devicePixelRatio === 'number' ? devicePixelRatio : 2 } };
  const look = lookMaterial(u), depth = lookDepth(u);
  const { solid, clear: glass } = shardMaterials(su);
  const group = new THREE.Group();
  group.name = 'debris';
  const meshes: THREE.Mesh[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Material, name: string) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.name = `debris:${name}`;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = m === look;
    mesh.userData.noAO = true;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
    meshes.push(mesh);
    return mesh;
  };
  let tris = 0;
  const r = seeded(4410);

  // The slabs.
  const slabBounds: { at: V3; r: number }[] = [];
  // What the small pieces may trail behind or hang about: the slabs and the larger chunks.
  const parents: { move: Move; r: number }[] = [];
  const unclear: string[] = [];
  let alone: CityPart['alone'];
  for (let i = 0; i < SLABS.length; i++) {
    const name = SLAB_NAMES[i];
    if (only && only !== name) continue;
    const slab = SLABS[i](1000 + i * 101);
    await slice();
    const b = slab.mesh.bounds(), bound = Math.hypot(...b.mid) + b.r;
    const p = PLAN.find((x) => x.name === name)!;
    const o = { scale: 1, seed: 11 + i };
    let move: Move;
    if (only) {
      // Alone: held still where the street slab is, its top toward the visitor and the core to one side.
      const at: V3 = [380, Y - 45, 760];
      move = hold(at, [0, 0, -1], 0, r, o);
      const qy = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.32, (turnDeg * Math.PI) / 180, 0));
      move.q0 = [qy.x, qy.y, qy.z, qy.w];
      move.rho = 0;
      alone = { at, r: bound * 0.9 };
    } else if (p.how === 'orbit') move = orbit(p.ring!, p.th0!, r, { ...o, spin: 0.012 });
    else if (p.how === 'tumble') move = tumble(p.at!, p.spin!, r, o);
    else { move = holdShowing(p.at!, p.face!, r, o); move.rho = 0; }
    if (!only && !clearAlways(move, bound * 0.85)) unclear.push(name);
    slabBounds.push({ at: moveAt(move, 0).at, r: bound });
    parents.push({ move, r: bound * 0.7 });
    const mesh = add(instanced(slab.mesh.geometry(await occlusion(slab.mesh, OCC.slab)), [move]), look, name);
    // A slab that holds its place does not move at all, so it may throw the moon's shadow, which is drawn once.
    if (move.mode === MODE.hold && !move.rho) { mesh.castShadow = true; mesh.customDepthMaterial = depth; }
    tris += slab.mesh.tris;
  }

  const shards: Shard[] = [];
  if (!only) {
    // The chunks and fragments: kinds made once, each drawn many times.
    const kinds = chunkKinds();
    await slice();
    const frags = fragmentKinds();
    await slice();
    const apart = (p: V3, b: number) => slabBounds.every((s) => Math.hypot(p[0] - s.at[0], p[1] - s.at[1], p[2] - s.at[2]) > s.r * 0.8 + b);

    // Somewhere for a piece of this size to be: in a ring round the world, holding or tumbling where it is.
    const placeOne = (size: number, seed: number, spin: readonly number[], inner: boolean): Move | null => {
      for (let tries = 0; tries < 40; tries++) {
        const way = r(), o = { scale: size, seed };
        let m: Move;
        if (way < 0.38) {
          const ring: Ring = inner && r() < 0.6
            ? { r: lerp(INNER.r, r()), y: lerp(INNER.y, r()), dip: (r() - 0.5) * 0.04, lean: (r() - 0.5) * 0.04, om: lerp(INNER.om, r()) * (r() < 0.85 ? 1 : -1) }
            : { r: lerp(OUTER.r, r()), y: lerp(OUTER.y, r()), dip: lerp(OUTER.dip, r()), lean: (r() - 0.5) * 0.12, om: lerp(OUTER.om, r()) * (r() < 0.85 ? 1 : -1) };
          m = orbit(ring, r() * TAU, r, { ...o, spin: lerp(spin, r()) * 0.25 });
        } else {
          // In front of the torn rock, beside it beyond the torn edge, or under it.
          const where = r();
          let at: V3;
          if (where < 0.45) at = [(r() - 0.5) * 1500, lerp([Y + 115, Y - 185], r() ** 0.8), lerp([620, 960], r())];
          else if (where < 0.75) { const s = r() < 0.5 ? -1 : 1; at = [s * lerp([640, 930], r()), lerp([Y + 130, Y - 125], r()), lerp([-150, 560], r())]; }
          else { const a = r() * TAU, d = lerp([230, 660], r()); at = [Math.sin(a) * d, lerp([TEAR.low - 8, DEBRIS.low + 10], r() ** 0.6), Math.cos(a) * d]; }
          m = way < 0.68 ? tumble(at, lerp(spin, r()), r, o) : holdShowing(at, [0, 1, 0], r, o);
        }
        if (clearAlways(m, size) && apart(moveAt(m, 0).at, size)) return m;
      }
      return null;
    };

    const chunkMoves: Move[][] = kinds.map(() => []);
    for (let i = 0; i < Math.round(COUNT.chunks * k); i++) {
      const size = 5 + 20 * r() ** 1.7, kind = pick(CHUNK_WEIGHT, r());
      const m = placeOne(size, 2000 + i + r(), SPIN.chunk, size < 14);
      if (m) chunkMoves[kind].push(m);
      if (m && size > 11) parents.push({ move: m, r: size });
    }
    for (let i = 0; i < kinds.length; i++) {
      const kd: Kind = kinds[i];
      if (!chunkMoves[i].length) continue;
      add(instanced(kd.mesh.geometry(await occlusion(kd.mesh, OCC.chunk)), chunkMoves[i]), look, `chunk-${i}`);
      tris += kd.mesh.tris * chunkMoves[i].length;
    }
    await slice();
    // A small piece that broke off with a larger one: it trails a little behind it on its ring, or hangs about it
    // where it holds or tumbles. These are what give the great pieces their size.
    const trail = (size: number, seed: number): Move | null => {
      for (let tries = 0; tries < 12; tries++) {
        const p = parents[Math.floor(r() * parents.length)], pm = p.move;
        let m: Move;
        if (pm.mode === MODE.orbit) {
          const lag = (0.012 + 0.07 * r() ** 1.5) * Math.sign(pm.om || 1), dy = (r() - 0.5) * p.r * 0.8;
          m = { ...pm, c: [pm.c[0], pm.c[1] + dy, pm.c[2]], rho: pm.rho + (r() - 0.5) * p.r * 0.8, th0: pm.th0 - lag, axis: [r() - 0.5, r() - 0.5, r() - 0.5].map((v, _, a) => v / (Math.hypot(...a) || 1)) as V3, w: lerp(SPIN.fragment, r()), scale: size, seed, ph: r() * TAU };
        } else {
          const z = r() * 2 - 1, a = r() * TAU, q = Math.sqrt(1 - z * z), d = p.r * (0.9 + 0.9 * r());
          m = tumble([pm.c[0] + q * Math.cos(a) * d, pm.c[1] + z * d, pm.c[2] + q * Math.sin(a) * d], lerp(SPIN.fragment, r()), r, { scale: size, seed });
        }
        if (clearAlways(m, size)) return m;
      }
      return null;
    };
    const fragMoves: Move[][] = frags.map(() => []);
    for (let i = 0; i < Math.round(COUNT.fragments * k); i++) {
      const size = 1 + 4 * r() ** 1.4, kind = pick(FRAGMENT_WEIGHT, r());
      const m = r() < TRAIL ? trail(size, 5000 + i + r()) : placeOne(size, 5000 + i + r(), SPIN.fragment, true);
      if (m) fragMoves[kind].push(m);
    }
    frags.forEach((kd, i) => {
      if (!fragMoves[i].length) return;
      add(instanced(kd.mesh.geometry(), fragMoves[i]), look, `fragment-${i}`);
      tris += kd.mesh.tris * fragMoves[i].length;
    });
    await slice();

    // The stream's own shards: most round its fall under the core, thickest just under the core and thinning toward
    // the foot, the rest among the other pieces.
    for (let i = 0; i < Math.round(COUNT.shards * k); i++) {
      const { size, kind } = riderSize(r), isClear = r() < CLEAR_SHARE, o = { scale: size, seed: 9000 + i };
      let m: Move | null = null;
      for (let tries = 0; tries < 40 && !m; tries++) {
        let c: Move;
        if (i < COUNT.shards * k * COUNT.eddy) {
          const y = lerp([FALL.top, FALL.foot], r() ** 1.9), rad = lerp(FALL.r, r() ** 1.3);
          c = eddy([SOURCE[0], y, SOURCE[2]], rad, lerp(FALL.om, r()) * (r() < 0.9 ? 1 : -1), 0.5, r, { ...o, spin: lerp(SPIN.shard, r()) });
        } else c = placeOne(size, o.seed, SPIN.shard, true) ?? eddy([0, FALL.top, 0], 100, 0.1, 0.5, r, { ...o, spin: 0.5 });
        if (clearAlways(c, Math.min(size, SMALL))) m = c;
      }
      if (m) shards.push({ move: m, kind, clear: isClear });
    }
    for (const lot of [false, true]) {
      const list = shards.filter((s) => s.clear === lot);
      if (!list.length) continue;
      add(bake(list), lot ? glass : solid, lot ? 'shards-clear' : 'shards');
      tris += list.reduce((n, s) => n + shardTriangles(s.kind), 0);
    }
  }
  group.userData.triangles = tris;
  group.userData.counts = { meshes: meshes.length, shards: shards.length };
  (globalThis as unknown as { __debris: unknown }).__debris = { unclear, tris, meshes: meshes.map((x) => [x.name, (x.geometry.getAttribute('position').count / 3) * ((x.geometry as THREE.InstancedBufferGeometry).instanceCount ?? 1)]) };

  const cursor = new THREE.Vector3();
  const tan = Math.tan((VIEW.el * Math.PI) / 180);
  return {
    group,
    alone: alone ?? { at: [0, (DEBRIS.low + DEBRIS.high) / 2, 300], r: 820 },
    update(s) {
      u.uT.value = s.t;
      u.uCore.value = s.core;
      // The cursor's light, where it falls on the debris' depth.
      cursor.copy(s.cursor);
      su.uLamp.value.set(cursor.x, cursor.y - cursor.z * tan, 0);
      return !only;
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      look.dispose();
      depth.dispose();
      solid.dispose();
      glass.dispose();
    },
  };
};

