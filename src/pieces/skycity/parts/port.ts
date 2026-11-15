import * as THREE from 'three';
import { slice } from '../../../world/build';
import { registry } from '../../../hooks/registry';
import type { PartFactory } from '../part';
import { type CraftModel, type CraftName, barque, lifter, mite, skiff } from './port/craft';
import { LANES, type Pose, holding, pose } from './port/flight';
import { U, glow, solidMaterial } from './port/materials';
import { buildPort } from './port/model';
import { traffic } from './port/traffic';
import { BARQUE, frame } from './port/plan';

// The port and every craft in the air over the world. The port is the Harbour in the Rock, at the right of the skyline,
// the match of the temple quarter's pyramid at the left (./port/plan.ts, ./port/model.ts): built in its own frame and
// seated whole on the world. The craft are drawn many times over, one draw for each kind, and flown from the clock
// alone (./port/flight.ts). The small lights are one set of glows (glow in ./port/materials.ts).

// With reduced motion or on the static tier, everything is shown as it is at this time.
const REST = 41;
// The pulse round the great ring: how often it sets off, and how long it takes to go round.
const PULSE = { every: 9.3, round: 3.4 };
// A strobe's flash: how often, and how long.
const STROBE = { every: 1.15, on: 0.12 };

export const build: PartFactory = async ({ tier }) => {
  const group = new THREE.Group();
  group.name = 'port';
  const mat = solidMaterial();
  const model = buildPort();
  await slice();
  // The citadel is drawn in its own frame, so what its shader works out from where a point is (the stone's courses, the
  // basin's swell) follows the building and not the world.
  const W = frame();
  const cast = new THREE.Mesh(model.cast.geometry(), mat), fine = new THREE.Mesh(model.fine.geometry(), mat), paving = new THREE.Mesh(model.paving.geometry(), mat);
  // The rock throws its shadow on the city but takes none on itself: on its broken faces the moon's one drawing of the
  // shadows would speckle it.
  const rock = new THREE.Mesh(model.rock.geometry(), mat);
  rock.castShadow = true;
  rock.receiveShadow = false;
  rock.matrix.copy(W);
  rock.matrixAutoUpdate = false;
  rock.name = 'port:rock';
  group.add(rock);
  cast.castShadow = cast.receiveShadow = true;
  fine.castShadow = false;
  fine.receiveShadow = true;
  paving.castShadow = false;
  paving.receiveShadow = true;
  for (const m of [cast, fine]) { m.matrix.copy(W); m.matrixAutoUpdate = false; group.add(m); }
  paving.matrixAutoUpdate = false;
  group.add(paving);
  cast.name = 'port:cast'; fine.name = 'port:fine'; paving.name = 'port:paving';
  for (const l of model.lamps) l.at.applyMatrix4(W);
  const tris = model.cast.tris + model.fine.tris + model.paving.tris + model.rock.tris;
  await slice();

  // The craft: one instanced mesh for each kind, one instance for each lane that flies it, and the barque.
  const kinds: Record<CraftName, CraftModel> = { skiff: skiff(), lifter: lifter(), barque: barque(BARQUE.len) };
  const size: Record<CraftName, THREE.Vector3> = { skiff: new THREE.Vector3(1, 1, 1), lifter: new THREE.Vector3(1, 1, 1), barque: new THREE.Vector3().setScalar(BARQUE.scale) };
  const fleet: { name: CraftName; mesh: THREE.InstancedMesh; thrust: THREE.InstancedBufferAttribute; who: number[] }[] = [];
  for (const name of ['skiff', 'lifter', 'barque'] as CraftName[]) {
    const who = name === 'barque' ? [-1] : LANES.map((l, i) => (l.craft === name ? i : -2)).filter((i) => i >= 0);
    const geo = kinds[name].geo, thrust = new THREE.InstancedBufferAttribute(new Float32Array(who.length * 4), 4);
    thrust.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('craft', thrust);
    const mesh = new THREE.InstancedMesh(geo, mat, who.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.name = `port:${name}`;
    group.add(mesh);
    fleet.push({ name, mesh, thrust, who });
  }
  // The city's traffic: one more instanced mesh, of the small craft in its lanes.
  const flow = traffic(), miteModel = mite(), mites = new THREE.InstancedMesh(miteModel.geo, mat, flow.count);
  miteModel.geo.setAttribute('craft', new THREE.InstancedBufferAttribute(new Float32Array(flow.count * 4), 4));
  mites.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mites.frustumCulled = false;
  mites.castShadow = false;
  mites.receiveShadow = false;
  mites.name = 'port:traffic';
  group.add(mites);
  const craftTris = fleet.reduce((s, f) => s + kinds[f.name].tris * f.who.length, 0) + miteModel.tris * flow.count;
  await slice();

  // The small lights: the port's own, then each craft's.
  const fixed = model.lamps;
  const moving = fleet.reduce((s, f) => s + kinds[f.name].lights.length * f.who.length, 0);
  const glows = glow(fixed.length + moving + flow.count * flow.lightsPer);
  group.add(glows.mesh);

  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P: Pose = { on: false, p: new THREE.Vector3(), q: new THREE.Quaternion(), thrust: 0, call: 0 };
  const m4 = new THREE.Matrix4(), none = new THREE.Vector3(0, 0, 0), v = new THREE.Vector3();
  const positions: Record<string, [number, number, number]> = {};
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  const step = (t: number) => {
    const ring = t % PULSE.every;
    U.uT.value = t;
    U.uRing.value = ring < PULSE.round ? ring / PULSE.round : 0;
    let g = fixed.length;
    for (const f of fleet) {
      const lights = kinds[f.name].lights, clear = kinds[f.name].clear * size[f.name].x;
      f.who.forEach((w, k) => {
        if (w === -1) holding(t, P); else pose(LANES[w], w, t, clear, P);
        m4.compose(P.p, P.q, P.on ? size[f.name] : none);
        f.mesh.setMatrixAt(k, m4);
        f.thrust.setX(k, P.on ? P.thrust : 0);
        positions[`${f.name}${k}`] = [P.p.x, P.p.y, P.p.z];
        const seed = (w + 3) * 0.137;
        for (const l of lights) {
          v.set(...l.at).applyMatrix4(m4);
          let k2 = l.k;
          if (l.does === 'engine') k2 *= 0.1 + 0.9 * P.thrust;
          else if (l.does === 'strobe') k2 *= ((t / STROBE.every + seed) % 1) < STROBE.on / STROBE.every ? 1 : 0;
          glows.set(g++, v.x, v.y, v.z, l.size, l.heat + (l.does === 'engine' ? 0.25 * P.thrust : 0), P.on ? k2 : 0);
        }
      });
      f.mesh.instanceMatrix.needsUpdate = true;
      f.thrust.needsUpdate = true;
    }
    fixed.forEach((l, i) => {
      let k = l.k, h = l.heat;
      if (l.does === 'blink') k *= ((t / 2.3 + l.phase) % 1) < 0.08 ? 1 : 0.12;
      else if (l.does === 'breath') { const b = (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 5.3 + l.phase * 6)) ** 1.6; k *= 0.25 + 0.75 * b; h += 0.05 * b; }

      glows.set(i, l.at.x, l.at.y, l.at.z, l.size, h, k);
    });
    const base = g;
    flow.step(t, (i, m, k) => mites.setMatrixAt(i, k > 0.02 ? m : hidden), (j, at, s, h, k) => glows.set(base + j, at.x, at.y, at.z, s, h, k));
    mites.instanceMatrix.needsUpdate = true;
    glows.flush();
  };
  step(REST);

  // Seen alone, it is framed on the massif, a little under its middle.
  const mid = new THREE.Vector3(0, 62, -20).applyMatrix4(W);

  registry.tool('portStats', () => ({ tris, craftTris, traffic: flow.count, lights: fixed.length + moving + flow.count * flow.lightsPer, craft: { ...positions } }));

  return {
    group,
    alone: { at: [mid.x, mid.y, mid.z], r: 110 },
    update(s) {
      const t = reduced || tier === 'static' ? REST : s.t;
      step(t);
      return !s.still;
    },
    dispose() {
      cast.geometry.dispose();
      fine.geometry.dispose();
      paving.geometry.dispose();
      rock.geometry.dispose();
      for (const f of fleet) f.mesh.geometry.dispose();
      mites.geometry.dispose();
      glows.mesh.geometry.dispose();
      (glows.mesh.material as THREE.Material).dispose();
      mat.dispose();
    },
  };
};
