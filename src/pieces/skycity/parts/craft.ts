import * as THREE from 'three';
import { slice } from '../../../world/build';
import { registry } from '../../../hooks/registry';
import { drawn } from '../layout';
import type { PartFactory } from '../part';
import { DESIGNS, type Design, type DesignName } from './craft/designs';
import { COURSES, CEILING, type Pose, fly, pose } from './craft/flight';
import { quads } from './craft/lights';
import { KIND, craftMaterial, glowBeforeRender, glowMaterial, uniformsOf } from './craft/look';

// What flies over the world: five craft, each a designed thing large enough to be known for a craft at the page's
// size (./craft/designs.ts), on long slow courses of their own (./craft/flight.ts). Every craft is one draw, moved
// from the clock on the processor, and their lights are one more. Nothing here casts a shadow: the moon's are drawn
// once. The lanes of small lights between the towers were tried and left out: they read as embers on the ground, not
// as traffic.
// ?only=craft&craft=barque shows one craft alone and close, held, and &turn=30 turns it that many degrees toward the
// visitor.

// With reduced motion or on the static tier, everything is shown as it is at this time.
const REST = 118;
// A strobe's flash: how often, and how long.
const STROBE = { every: 1.6, on: 0.1 };
// How much larger than it was built a craft flies, so the small fast ones are still known for craft at the page's size.
const SIZE: Partial<Record<DesignName, number>> = { courier: 1.25, dart: 1.2 };

export const build: PartFactory = async ({ tier }) => {
  const group = new THREE.Group();
  group.name = 'craft';
  const q = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);
  const show = q.get('craft') as DesignName | null, alone = show && show in DESIGNS ? show : null;
  const turnAlone = Number(q.get('turn') ?? 0) * (Math.PI / 180);

  const flown = fly();
  const fleet: { name: DesignName; design: Design; mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; flown: (typeof flown)[number]; i: number }[] = [];
  for (let i = 0; i < COURSES.length; i++) {
    const name = COURSES[i].craft;
    if (alone && name !== alone) continue;
    const design = DESIGNS[name](), grow = SIZE[name] ?? 1;
    if (grow !== 1) {
      design.geo.scale(grow, grow, grow);
      const cell = design.geo.getAttribute('cell') as THREE.BufferAttribute;
      for (let v = 0; v < cell.count; v++) if (Math.round(cell.getX(v)) === KIND.engine) cell.setXYZW(v, cell.getX(v), cell.getY(v) * grow, cell.getZ(v) * grow, cell.getW(v) * grow);
      for (const l of design.lights) { l.at = [l.at[0] * grow, l.at[1] * grow, l.at[2] * grow]; l.size *= grow; if (l.streak) l.streak *= grow; }
      design.len *= grow;
    }
    const mat = craftMaterial(i * 1.37 + 0.4), mesh = new THREE.Mesh(design.geo, mat);
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.name = `craft:${name}`;
    group.add(mesh);
    fleet.push({ name, design, mesh, mat, flown: flown[i], i });
    await slice();
  }

  const glowMat = glowMaterial();
  await slice();

  // The craft's own lights, put where they are each frame.
  const lit = fleet.flatMap((f) => f.design.lights.map((l) => ({ f, l })));
  const lightGeo = quads(lit.map(({ l }) => ({ at: l.at, dir: l.dir ?? [-1, 0, 0], look: [l.size, l.heat, l.k, l.streak ?? 0] })));
  const lights = new THREE.Mesh(lightGeo, glowMat);
  lights.frustumCulled = false;
  lights.renderOrder = 3;
  lights.userData.noAO = true;
  lights.name = 'craft:lights';
  glowBeforeRender(lights);
  group.add(lights);
  const lp = lightGeo.getAttribute('position') as THREE.BufferAttribute, ld = lightGeo.getAttribute('dir') as THREE.BufferAttribute, lk = lightGeo.getAttribute('look') as THREE.BufferAttribute;
  lp.setUsage(THREE.DynamicDrawUsage);
  ld.setUsage(THREE.DynamicDrawUsage);
  lk.setUsage(THREE.DynamicDrawUsage);

  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P: Pose = { on: false, p: new THREE.Vector3(), q: new THREE.Quaternion(), thrust: 0 };
  const one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3(), d = new THREE.Vector3(), where: Record<string, unknown> = {};
  const held = new THREE.Vector3(0, 100, 0);

  const step = (t: number) => {
    let g = 0;
    for (const f of fleet) {
      if (alone) {
        P.on = true;
        P.p.copy(held);
        P.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), turnAlone);
        P.thrust = 0.8;
      } else pose(f.flown, f.i, t, P);
      f.mesh.visible = P.on;
      f.mesh.matrix.compose(P.p, P.q, one);
      f.mesh.matrixWorldNeedsUpdate = true;
      const u = uniformsOf(f.mat);
      u.uT.value = t;
      u.uThrust.value = P.thrust;
      where[f.name] = P.on ? { at: [Math.round(P.p.x), Math.round(P.p.y), Math.round(P.p.z)], drawn: drawn(P.p.x, P.p.y, P.p.z).map(Math.round) } : null;
      for (const l of f.design.lights) {
        v.set(...l.at).applyQuaternion(P.q).add(P.p);
        d.set(...(l.dir ?? [-1, 0, 0])).applyQuaternion(P.q);
        let k = P.on ? l.k : 0;
        if (l.does === 'engine') k *= 0.35 + 0.75 * P.thrust;
        else if (l.does === 'strobe') k *= ((t / STROBE.every + f.i * 0.29) % 1) < STROBE.on / STROBE.every ? 1 : 0.06;
        else if (l.does === 'belly') k *= 0.85 + 0.15 * Math.sin(t * 2.1 + f.i);
        for (let c = 0; c < 4; c++) {
          lp.setXYZ(g * 4 + c, v.x, v.y, v.z);
          ld.setXYZ(g * 4 + c, d.x, d.y, d.z);
          lk.setZ(g * 4 + c, k);
        }
        g++;
      }
    }
    lp.needsUpdate = true;
    ld.needsUpdate = true;
    lk.needsUpdate = true;
  };
  step(REST);

  registry.tool('craftState', () => ({ craft: { ...where }, ceiling: CEILING, tris: fleet.map((f) => [f.name, Math.round(f.design.tris)]) }));
  // Samples every course over a stretch of the clock: how many craft are in the first screen's picture at each moment,
  // and the highest each comes in the picture.
  registry.tool('craftCourse', (from = 0, to = 600, every = 1) => {
    const seen: number[] = [], high: Record<string, number> = {}, Q: Pose = { on: false, p: new THREE.Vector3(), q: new THREE.Quaternion(), thrust: 0 };
    for (let t = Number(from); t <= Number(to); t += Number(every)) {
      let n = 0;
      for (const f of fleet) {
        pose(f.flown, f.i, t, Q);
        if (!Q.on) continue;
        const [x, y] = drawn(Q.p.x, Q.p.y, Q.p.z);
        if (Math.abs(x) < 700 && y > 0 && y < 470) n++;
        high[f.name] = Math.min(high[f.name] ?? 1e9, y);
      }
      seen.push(n);
    }
    return { seen: seen.join(''), line: drawn(0, CEILING, 0)[1], high };
  });

  registry.tool('craftTune', (tries = 300) => {
    const Q: Pose = { on: false, p: new THREE.Vector3(), q: new THREE.Quaternion(), thrust: 0 };
    const score = () => {
      let bad = 0;
      for (let t = 0; t <= 1800; t += 4) {
        let n = 0;
        for (const f of fleet) { pose(f.flown, f.i, t, Q); if (!Q.on) continue; const [x, y] = drawn(Q.p.x, Q.p.y, Q.p.z); if (Math.abs(x) < 700 && y > 0 && y < 470) n++; }
        bad += n === 0 ? 30 : n === 1 ? 6 : n === 4 ? 1 : n >= 5 ? 8 : 0;
      }
      return bad;
    };
    let best = score(), keep = COURSES.map((c) => c.from);
    for (let k = 0; k < Number(tries); k++) {
      const was = COURSES.map((c) => c.from);
      COURSES.forEach((c) => { c.from = Math.round(Math.random() * 400); });
      const s = score();
      if (s < best) { best = s; keep = COURSES.map((c) => c.from); } else COURSES.forEach((c, i) => { c.from = was[i]; });
    }
    COURSES.forEach((c, i) => { c.from = keep[i]; });
    return { best, from: keep };
  });
  const len = alone ? fleet[0]?.design.len ?? 60 : 0;
  return {
    group,
    alone: alone ? { at: [held.x, held.y + 4, held.z], r: len * 0.56 } : { at: [0, 60, 0], r: 760 },
    update(s) {
      step(reduced || tier === 'static' || alone ? (alone ? 4 : REST) : s.t);
      return !s.still && !alone;
    },
    dispose() {
      for (const f of fleet) { f.design.geo.dispose(); f.mat.dispose(); }
      lightGeo.dispose();
      glowMat.dispose();
    },
  };
};
