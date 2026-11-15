import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import type { PartFactory } from '../part';
import { SPIRE } from '../layout';
import { BEACON, LIFT, SUN } from './spire/form';
import { U, spireMaterials } from './spire/materials';
import { buildSpire } from './spire/model';

// The great tower of the city, at the top of the world: a battered terrace of stone with a pylon gate on each side,
// a core of glass with rooms in it between four stone piers that flare out over the terrace, a ring round the body,
// a lotus capital of copper carrying a lit gallery, and the crown: a sun of lit glass in a cage of gilded meridians
// whose four rings step in as they rise. Then the needle and its beacon. A line of light runs up its front with a lift
// riding it, a pulse climbs the rings now and then, a chase runs round the rings' lamps, and the beacon breathes.
// All of it from the clock alone.

// The beacon's breath, in seconds, and the halo round it, in units: at rest and at the top of a breath.
const BREATH = 4.6;
const HALO = { rest: 7, full: 20, dim: 0.08, bright: 0.45 };
// The sun's own glow round it, in units, and how strong: soft and small, so it lays no haze over the page.
const GLOW = { size: 92, strength: 0.12 };
// How often a pulse sets off up the rings, how long it takes to climb, and where it starts and ends.
const PULSE = { every: 13.7, climb: 4.2, from: -60, to: 300 };
// With reduced motion or on the static tier, everything is shown as it is at this time.
const REST = 3.1;

const hash = (k: number) => { let s = (k * 2654435761) >>> 0; s ^= s >>> 15; s = Math.imul(s, 2246822507) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; };
const ease = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * t * (t * (6 * t - 15) + 10); };

// The lift: each slot of time it waits at one level and then runs to another, one to three levels on, picked from the
// slot's number, so it never waits two slots running and the run of trips never repeats.
const level = (k: number) => (2 * k + Math.floor(hash(k) * 2)) % LIFT.levels.length;
export function liftAt(t: number): number {
  const L = LIFT.levels, k = Math.floor(t / LIFT.slot), tau = t - k * LIFT.slot;
  const from = L[level(k)], to = L[level(k + 1)];
  const run = Math.abs(to - from) / LIFT.speed;
  return from + (to - from) * ease((tau - LIFT.dwell) / Math.max(run, 0.01));
}

export const build: PartFactory = async ({ tier }) => {
  const { mats, of } = spireMaterials();
  const { group, tris, meshes } = await buildSpire(of);
  const halo = new THREE.Sprite(mats.halo);
  halo.position.set(0, (BEACON.from + BEACON.to) / 2, 0);
  halo.renderOrder = 2;
  group.add(halo);
  const glowMat = mats.halo.clone();
  glowMat.color.multiplyScalar(GLOW.strength);
  const glow = new THREE.Sprite(glowMat);
  glow.position.set(0, SUN.y, 0);
  glow.scale.setScalar(GLOW.size);
  glow.renderOrder = 2;
  group.add(glow);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hot = mats.halo.color.clone();

  registry.tool('spireStats', () => ({ tris, meshes: meshes.length, lift: U.uLift.value, beacon: U.uBeacon.value }));

  return {
    group,
    alone: { at: [0, SPIRE.tall / 2, 0], r: SPIRE.tall * 0.4 },
    update(s) {
      const t = reduced || tier === 'static' ? REST : s.t;
      U.uT.value = t;
      U.uLift.value = liftAt(t);
      const b = (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / BREATH)) ** 1.6;
      U.uBeacon.value = b;
      halo.scale.setScalar(HALO.rest + (HALO.full - HALO.rest) * b);
      mats.halo.color.copy(hot).multiplyScalar(HALO.dim + (HALO.bright - HALO.dim) * b);
      const p = t % PULSE.every;
      U.uPulse.value = p < PULSE.climb ? PULSE.from + ((PULSE.to - PULSE.from) * p) / PULSE.climb : -1e4;
      return true;
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      mats.solid.dispose();
      mats.light.dispose();
      mats.halo.map?.dispose();
      mats.halo.dispose();
      glowMat.dispose();
    },
  };
};
