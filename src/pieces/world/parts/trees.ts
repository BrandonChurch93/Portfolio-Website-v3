import * as THREE from 'three';
import { hex, type PaletteName } from '../../../config/palette';
import { ground, seeded, within } from '../layout';
import { load } from '../files';
import type { PartFactory } from '../part';
import { TOWERS, TREES } from '../placed';
import { leaves, release } from './trees/atlas';
import { FILES, MODELS } from './trees/design';
import { AIR, treeDepth, treeMaterial } from './trees/material';

// The trees: the belt along the city's front and the few among the buildings, each where TREES has it (./placed.ts)
// and as wide. Four models of one kind of tree, made ahead by scripts/world/parts/trees/ with their stored light,
// each drawn for many trees at once with a place, a turn, a size, a shade and a phase of its own. A tree whose
// ground the tear took is left out.

// The autumn: each shade a mix of two of the palette's colors, how bright a leaf of it is, and how many of the
// trees wear it. Most are copper, bronze and russet; a few toward flame and toward pale gold.
const AUTUMN: readonly { mix: readonly [PaletteName, PaletteName, number]; power: number; share: number }[] = [
  { mix: ['copper', 'ember', 0.35], power: 0.66, share: 0.3 },
  { mix: ['bronze', 'ember', 0.4], power: 0.86, share: 0.2 },
  { mix: ['copper', 'ember', 0.55], power: 0.73, share: 0.2 },
  { mix: ['flame', 'ember', 0.4], power: 0.55, share: 0.14 },
  { mix: ['flame', 'copper', 0.35], power: 0.51, share: 0.08 },
  { mix: ['copper-light', 'flame', 0.3], power: 0.48, share: 0.08 },
];
// How much one tree differs from the next of its shade in brightness, and in height against its width.
const DIFFER = { light: 0.14, tall: 0.1 };
// The city behind a tree: how far behind it and to each side a building is counted, and how tall the buildings
// behind have to be together for its outline to be lit in full.
const BEHIND = { deep: 260, side: 26, full: 260 };
// How many trees within so many crowns of one shut it in fully.
const CROWDED = { near: 2.4, full: 4 };

const shadeOf = (k: number): THREE.Color => {
  let a = 0;
  for (const s of AUTUMN) { a += s.share; if (k <= a) return new THREE.Color(hex(s.mix[0])).lerp(new THREE.Color(hex(s.mix[1])), s.mix[2]).multiplyScalar(s.power); }
  const s = AUTUMN[AUTUMN.length - 1];
  return new THREE.Color(hex(s.mix[0])).lerp(new THREE.Color(hex(s.mix[1])), s.mix[2]).multiplyScalar(s.power);
};

export const build: PartFactory = async ({ query }) => {
  const [file, map] = await Promise.all([load(FILES.mesh), leaves()]);
  const group = new THREE.Group(), made: { dispose(): void }[] = [];
  const kept = TREES.filter(([x, z, size]) => within(x, z) >= size);
  const rnd = seeded(4049);

  // Which model each tree is, and everything about it that never changes.
  const byModel: { m: THREE.Matrix4; tone: THREE.Color; tree: [number, number, number, number] }[][] = Array.from({ length: MODELS }, () => []);
  for (const [x, z, size, tone, turn] of kept) {
    const model = Math.floor((((tone * 7.31 + turn * 0.377) % 1) + 1) % 1 * MODELS) % MODELS;
    let behind = 0, near = 0;
    for (const [bx, bz, w, , tall] of TOWERS) if (bz < z - 4 && z - bz < BEHIND.deep && Math.abs(bx - x) < w / 2 + BEHIND.side) behind += tall * (1 - (z - bz) / BEHIND.deep);
    for (const [ox, oz, os] of kept) if ((ox !== x || oz !== z) && Math.hypot(ox - x, oz - z) < CROWDED.near * (size + os) / 2) near++;
    const shade = shadeOf(rnd()).multiplyScalar(1 + DIFFER.light * (2 * rnd() - 1)), tall = 1 + DIFFER.tall * (2 * rnd() - 1);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, ground(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn), new THREE.Vector3(size, size * tall, size));
    byModel[model].push({ m, tone: shade, tree: [rnd(), Math.min(1, behind / BEHIND.full), Math.min(1, near / CROWDED.full), 0] });
  }

  const passes = [treeMaterial(map, 0), treeMaterial(map, 1)], depth = treeDepth(map);
  made.push(passes[0].material, passes[1].material, depth);
  for (let k = 0; k < MODELS; k++) {
    const l = file.meshes.get(`tree-${k}`), trees = byModel[k];
    if (!l || !trees.length) continue;
    // The second pass draws only what has soft edges, which the make script put last: the same vertices, fewer
    // triangles.
    const g = l.geometry, soft = new THREE.BufferGeometry(), from = Number(l.info.soft ?? 0), n = trees.length, own = new THREE.Matrix4().compose(l.at, new THREE.Quaternion(), new THREE.Vector3().setScalar(l.size));
    const at = new THREE.InstancedBufferAttribute(new Float32Array(n * 16), 16), tone = new Float32Array(n * 3), tree = new Float32Array(n * 4), m = new THREE.Matrix4();
    trees.forEach((t, i) => { m.multiplyMatrices(t.m, own).toArray(at.array, i * 16); tone.set([t.tone.r, t.tone.g, t.tone.b], i * 3); tree.set(t.tree, i * 4); });
    g.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 3));
    g.setAttribute('aTree', new THREE.InstancedBufferAttribute(tree, 4));
    for (const [name, a] of Object.entries(g.attributes)) soft.setAttribute(name, a);
    const index = g.getIndex();
    if (index) soft.setIndex(new THREE.BufferAttribute(index.array.subarray(from), 1));
    soft.boundingBox = g.boundingBox;
    soft.boundingSphere = g.boundingSphere;
    made.push(g, soft);
    passes.forEach((p, i) => {
      const mesh = new THREE.InstancedMesh(i === 0 ? g : soft, p.material, n);
      mesh.instanceMatrix = at;
      mesh.castShadow = i === 0;
      mesh.receiveShadow = true;
      mesh.customDepthMaterial = depth;
      mesh.renderOrder = i;
      mesh.matrixAutoUpdate = false;
      mesh.computeBoundingSphere();
      group.add(mesh);
    });
  }
  // How far the leaves move, in the shares of its own cube a model's positions are in: the same for every model.
  const cube = file.meshes.get('tree-0')?.size ?? 1;
  for (const p of passes) p.uniforms.uAir.value = AIR.reach / cube;

  const [x0, z0, s0] = kept[Math.floor(kept.length / 2)] ?? [0, 0, 8];
  return {
    group,
    // Seen alone, so many crowns round the middle one (?trees=16 is about as close as three times the page's size).
    alone: { at: [x0, ground(x0, z0) + s0 * 1.2, z0], r: s0 * (Number(query.get('trees')) || 6) },
    update(s) {
      for (const p of passes) p.uniforms.uTime.value = s.still ? 0 : s.t;
      return true;
    },
    dispose() { for (const d of made) d.dispose(); release(map); },
  };
};
