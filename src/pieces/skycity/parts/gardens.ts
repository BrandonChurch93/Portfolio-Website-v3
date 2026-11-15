import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import { slice } from '../../../world/build';
import { VIEW, lift, seat } from '../layout';
import type { PartFactory } from '../part';
import { ATLAS, bake } from './gardens/bake';
import { sow } from './gardens/forest';
import { U, cardDepth, cardMaterial } from './gardens/materials';

// The jungle at the left of the world, round the temple (FOREST in the plan), far out of scale on purpose. Every tree
// in it is a real tree drawn once, when it is built, from the page's own view (./gardens/trees.ts, ./gardens/bake.ts),
// and drawn in the world as that picture on a square standing where the tree stands, facing the view, lit by the moon
// and the cursor's light as the picture says it faces at each pixel (./gardens/materials.ts). The view never moves,
// so the picture is the tree. The whole jungle is one draw. Its colors are in ./gardens/colors.ts and nowhere else.

// How far in front of its trunk a tree's shadows are looked up, as a share of its square: the front of its crown.
const FRONT = 0.45;
// How much darker the jungle's furthest trees are than its nearest, so its layers stand apart.
const DEEPER = 0.45;

export const build: PartFactory = async ({ renderer }) => {
  const group = new THREE.Group();
  group.name = 'gardens';
  const atlas = await bake(renderer);
  U.uAlbedo.value = atlas.albedo;
  U.uNormal.value = atlas.normal;
  U.uTall.value = ATLAS.high / ATLAS.wide;
  const things = sow(atlas.cells);
  await slice();

  // Toward the visitor, along the view.
  const el = (VIEW.el * Math.PI) / 180, toward = new THREE.Vector3(0, Math.sin(el), Math.cos(el));
  const placed = things.map((t) => ({ t, depth: lift(t.x, 0, t.z).dot(toward) })).sort((a, b) => b.depth - a.depth);
  const front = placed[0]?.depth ?? 0, back = placed[placed.length - 1]?.depth ?? 0;
  const n = placed.length;
  const plane = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const cell = new Float32Array(n * 4), look = new Float32Array(n * 4);
  plane.setAttribute('cell', new THREE.InstancedBufferAttribute(cell, 4));
  plane.setAttribute('look', new THREE.InstancedBufferAttribute(look, 4));
  const mat = cardMaterial(), mesh = new THREE.InstancedMesh(plane, mat, n);
  const m = new THREE.Matrix4(), up = new THREE.Vector3(), right = new THREE.Vector3(), base = new THREE.Vector3(), d = new THREE.Vector3(), p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
  const c0 = new THREE.Vector3(), c1 = new THREE.Vector3(), c2 = new THREE.Vector3();
  const roles: Record<string, number> = {};
  placed.forEach(({ t, depth }, i) => {
    const c = atlas.cells[t.m], side = c.side * (t.h / c.tall);
    roles[c.role] = (roles[c.role] ?? 0) + 1;
    seat(t.x, t.z, 0, 0, m);
    up.setFromMatrixColumn(m, 1).normalize();
    up.addScaledVector(toward, -up.dot(toward)).normalize();
    if (t.lean) {
      lift(t.x, 0, t.z, p0);
      const k = 5 / Math.max(1e-3, Math.hypot(t.dir[0], t.dir[1]));
      lift(t.x + t.dir[0] * k, 0, t.z + t.dir[1] * k, p1);
      d.subVectors(p1, p0).addScaledVector(toward, -d.dot(toward));
      right.crossVectors(up, toward);
      up.applyAxisAngle(toward, (d.dot(right) > 0 ? -1 : 1) * t.lean);
    }
    right.crossVectors(up, toward).normalize();
    lift(t.x, t.rise - t.sink * (t.h / c.tall), t.z, base);
    c0.copy(right).multiplyScalar(side * (t.flip ? -1 : 1));
    c1.copy(up).multiplyScalar(side);
    c2.copy(toward).multiplyScalar(side * FRONT);
    base.addScaledVector(c0, -(c.ox - 0.5)).addScaledVector(c1, -c.oy);
    m.makeBasis(c0, c1, c2).setPosition(base);
    mesh.setMatrixAt(i, m);
    cell.set([c.u, c.w, c.size, c.ox], i * 4);
    look.set([t.hue, t.glow > 1.5 ? t.value : t.value * (1 - DEEPER * (front - depth) / Math.max(1, front - back)), t.glow, 0], i * 4);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.customDepthMaterial = cardDepth();
  mesh.matrixAutoUpdate = false;
  mesh.userData.noAO = true;
  mesh.name = 'gardens:jungle';
  group.add(mesh);
  await slice();

  registry.tool('gardensStats', (role?: string) => ({ tris: n * 2, things: n, roles, meshes: group.children.length, at: role ? things.filter((t) => atlas.cells[t.m].role === role).map((t) => [Math.round(t.x), Math.round(t.z), Math.round(t.h)]) : undefined }));

  // ?gardensAt=x,y,z,r frames the jungle alone at a place on the plan's map, so high over its ground, for a close
  // look. Without it, the whole of it.
  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('gardensAt')?.split(',').map(Number);
  const want = asked?.length === 4 && asked.every(Number.isFinite) ? asked : [-440, 20, -40, 300];
  const alone = { at: lift(want[0], want[1], want[2]).toArray() as [number, number, number], r: want[3] };

  return {
    group,
    alone,
    dispose() {
      plane.dispose();
      mat.dispose();
      mesh.customDepthMaterial?.dispose();
      atlas.dispose();
    },
  };
};
