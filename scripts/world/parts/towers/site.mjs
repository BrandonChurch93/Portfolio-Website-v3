// Where a tower stands, and what stands round it while its light is baked: the ground, lit warm by the street near
// its foot, and its neighbours as plain blocks giving off the city's own light, so that it is shut in and lit as
// it will be among them. None of these is kept: they are in the bake only.
import * as THREE from 'three';
import { L, P, linear } from '../../lib/plan.mjs';
import { Kit } from './kit.mjs';

// The street's light, as radiance at its brightest, how far out from the foot it is brightest and how wide that
// band is, in units. The city's own light on a neighbour's faces, as radiance.
const STREET = { power: 0.45, at: 9, wide: 14 }, CITY = 0.12, NEAR = 170, GROUND = 0.05;

// The matrix that puts a tower's own frame in the world: turned about its foot, standing on the ground.
export function placeOf(x, z, turn) {
  return new THREE.Matrix4().makeRotationY(turn * L.D2R).setPosition(x, L.ground(x, z), z).toArray();
}

export function occluders(skip, x0, z0) {
  const kit = new Kit({ block: { width: 0 } });
  P.TOWERS.forEach(([x, z, w, d, tall, turn], i) => {
    if (i === skip || Math.hypot(x - x0, z - z0) > NEAR) return;
    const c = Math.cos(turn * L.D2R), s = Math.sin(turn * L.D2R), g = L.ground(x, z) - 2;
    const at = (u, v) => [x + u * c + v * s, z - u * s + v * c];
    kit.prism('block', [at(-w / 2, d / 2), at(w / 2, d / 2), at(w / 2, -d / 2), at(-w / 2, -d / 2)], g, g + tall + 2, { top: true, edge: 12 });
  });
  const blocks = kit.meshes(new THREE.Matrix4().toArray()).block;
  const hot = linear('hot'), nb = blocks.positions.length / 3, glow = new Float32Array(nb * 3);
  for (let i = 0; i < nb; i++) if (Math.abs(blocks.normals[i * 3 + 1]) < 0.5) glow.set(hot.map((v) => Math.PI * CITY * v), i * 3);

  const step = 3, half = NEAR, n = Math.round((2 * half) / step) + 1, pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), emit = new Float32Array(n * n * 3), idx = [];
  const [, , w0, d0, , turn0] = P.TOWERS[skip], c0 = Math.cos(turn0 * L.D2R), s0 = Math.sin(turn0 * L.D2R);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = x0 - half + i * step, z = z0 - half + j * step, k = j * n + i;
    pos.set([x, L.ground(x, z), z], k * 3);
    nor.set([0, 1, 0], k * 3);
    const u = (x - x0) * c0 - (z - z0) * s0, v = (x - x0) * s0 + (z - z0) * c0;
    const out = Math.hypot(Math.max(0, Math.abs(u) - w0 / 2), Math.max(0, Math.abs(v) - d0 / 2));
    const k2 = out > 0 ? STREET.power * Math.exp(-(((out - STREET.at) / STREET.wide) ** 2)) : 0;
    emit.set(hot.map((h) => Math.PI * k2 * h), k * 3);
    if (i < n - 1 && j < n - 1) idx.push(k, k + n, k + 1, k + 1, k + n, k + n + 1);
  }
  return [
    { name: 'blocks', positions: blocks.positions, normals: blocks.normals, indices: blocks.indices, albedo: [GROUND, GROUND * 0.85, GROUND * 0.7], emit: glow, receive: false },
    { name: 'ground', positions: pos, normals: nor, indices: new Uint32Array(idx), albedo: [GROUND, GROUND * 0.85, GROUND * 0.7], emit, receive: false },
  ];
}
