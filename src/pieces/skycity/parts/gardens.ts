import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import { slice } from '../../../world/build';
import { lift, seat } from '../layout';
import type { PartFactory } from '../part';
import { sow } from './gardens/forest';
import { U, leafMaterial } from './gardens/materials';
import { KINDS, VARIANTS, treeGeometry, type TreeKind } from './gardens/trees';

// The jungle at the left of the world, round the temple and up the lower slopes of the small mountains behind it
// (FOREST in the plan, ./gardens/plan.ts). Never green: near black and dark bronze in its depths, copper and ember in
// the mass of its canopy, copper-light where the moon catches the tops. Everything in it is drawn many times over,
// one draw for each kind and shape, by one program (./gardens/materials.ts), each thing standing straight out from
// the ground under it. Nothing in it moves, so what is large enough casts the moon's shadow.

// Kinds drawn in one shape only.
const ONE: TreeKind[] = ['shrub', 'log', 'vine', 'lamp'];
// Kinds too small or too low to throw a shadow worth its cost.
const NO_SHADOW: TreeKind[] = ['shrub', 'boulder', 'log', 'vine', 'lamp'];

export const build: PartFactory = async () => {
  const group = new THREE.Group();
  group.name = 'gardens';
  const leaf = leafMaterial();
  const things = sow();
  await slice();

  const o = new THREE.Object3D(), at = new THREE.Matrix4(), c = new THREE.Color();
  o.rotation.order = 'YXZ';
  let tris = 0;
  const perKind: Record<string, number> = {}, counts: Record<string, number> = {};
  for (const kind of KINDS) {
    const mine = things.filter((p) => p.kind === kind);
    counts[kind] = mine.length;
    const shapes = ONE.includes(kind) ? 1 : VARIANTS;
    for (let v = 0; v < shapes; v++) {
      const set = mine.filter((_, i) => i % shapes === v);
      if (!set.length) continue;
      const geo = treeGeometry(kind, v), mesh = new THREE.InstancedMesh(geo, leaf, set.length);
      const tint = new Float32Array(set.length * 3), tree = new Float32Array(set.length * 4);
      set.forEach((p, k) => {
        o.position.set(0, 0, 0);
        o.rotation.set(p.tilt, p.turn, 0);
        o.scale.set(...p.s);
        o.updateMatrix();
        mesh.setMatrixAt(k, seat(p.x, p.z, p.up, 0, at).multiply(o.matrix));
        c.setHex(p.tint);
        tint.set([c.r, c.g, c.b], k * 3);
        tree.set([(k * 0.618034) % 1, p.glow, p.bark, 0], k * 4);
      });
      geo.setAttribute('tint', new THREE.InstancedBufferAttribute(tint, 3));
      geo.setAttribute('tree', new THREE.InstancedBufferAttribute(tree, 4));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.castShadow = !NO_SHADOW.includes(kind);
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.name = `gardens:${kind}${v}`;
      group.add(mesh);
      const each = (geo.index ? geo.index.count : geo.getAttribute('position').count) / 3;
      tris += each * set.length;
      perKind[kind] = (perKind[kind] ?? 0) + each * set.length;
    }
    await slice();
  }
  registry.tool('gardensStats', () => ({ tris: Math.round(tris), things: things.length, counts, perKind, meshes: group.children.length }));

  // ?gardensAt=x,y,z,r frames the jungle alone at a place on the plan's map, so high over its ground, for a close
  // look. Without it, the whole of it.
  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('gardensAt')?.split(',').map(Number);
  const want = asked?.length === 4 && asked.every(Number.isFinite) ? asked : [-440, 20, -40, 300];
  const alone = { at: lift(want[0], want[1], want[2]).toArray() as [number, number, number], r: want[3] };

  return {
    group,
    alone,
    update(s) {
      U.uLamp.value.copy(s.cursor);
    },
    dispose() {
      group.traverse((x) => { if (x instanceof THREE.Mesh) x.geometry.dispose(); });
      leaf.dispose();
    },
  };
};
