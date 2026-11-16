import * as THREE from 'three';
import { hex, type PaletteName } from '../../../config/palette';
import { MOONWARD, ground, seeded, within } from '../layout';
import { load } from '../files';
import type { PartFactory } from '../part';
import { TOWERS, TREES } from '../placed';
import { leaves, release } from './trees/atlas';
import { FAR, FILES, MODELS, SHADE } from './trees/design';
import { AIR, JITTER, treeDepth, treeMaterial, treeUniforms } from './trees/material';

// The trees: the belt along the city's front and the few among the buildings, each where TREES has it (./placed.ts)
// and as wide. Models of one kind of tree, made ahead by scripts/world/parts/trees/ with their stored light, each
// drawn for many trees at once with a place, a turn, a size, a height, a shade and a number of its own. A tree most
// of which a tree in front of it hides is drawn with the cheap model. A tree whose ground the tear took is left out.

// The autumn: each shade a mix of two of the palette's colors, how bright a leaf of it is, and how many of the
// trees wear it. Deep bronze browns, russet and copper most of all, some tan, a few ember reds and a few pale gold.
const AUTUMN: readonly { mix: readonly [PaletteName, PaletteName, number]; power: number; share: number }[] = [
  { mix: ['bronze', 'bronze-deep', 0.45], power: 1.0, share: 0.2 },
  { mix: ['bronze', 'ember', 0.3], power: 0.95, share: 0.18 },
  { mix: ['copper', 'bronze', 0.45], power: 0.78, share: 0.18 },
  { mix: ['copper-light', 'bronze', 0.55], power: 0.72, share: 0.13 },
  { mix: ['flame', 'ember', 0.62], power: 0.95, share: 0.1 },
  { mix: ['bronze-deep', 'ember', 0.3], power: 1.25, share: 0.11 },
  { mix: ['copper-light', 'hot', 0.3], power: 0.6, share: 0.1 },
];
// How much one tree differs from the next of its shade in brightness, in size and in height against its width.
const DIFFER = { light: 0.16, size: 0.1, tall: [0.84, 1.18] } as const;
// Which of the full models a tree in front is, and how many of the trees are each.
const NEAR: readonly { model: number; share: number }[] = [
  { model: MODELS.indexOf('round'), share: 0.45 },
  { model: MODELS.indexOf('tall'), share: 0.25 },
  { model: MODELS.indexOf('twin'), share: 0.3 },
];
// A tree is hidden, and takes the cheap model, when one at least as big stands this far in front of it (in its own
// sizes) and this close to its line across.
const HIDDEN = { front: 0.35, across: 0.55, big: 0.85 };
// The city behind a tree: how far behind it and to each side a building is counted, and how tall the buildings
// behind have to be together for its outline to be lit in full.
const BEHIND = { deep: 260, side: 26, full: 260 };
// The moon's shade from the trees nearer it: how far toward the moon a tree is looked for (in the two trees' sizes
// together) and how near its line, how far a crown's shade drops for each unit it falls (the moon is 27 degrees
// up), and how high a crown's top stands in its own sizes. A tree's crown is in that shade up to the highest any
// of them reaches on it, as a share of its height. The trees take no shade of the moon's from its shadow map: the
// towers behind would cover the whole belt, where picture 9 has its tops lit.
const SHADED = { far: 3, side: 0.7, drop: 0.52, top: 2 };
// The shade on the ground is cut where it would pass this far inside the land's edge, in the tree's sizes.
const EDGE = 0.4;

const shadeOf = (k: number): THREE.Color => {
  let a = 0, s = AUTUMN[AUTUMN.length - 1];
  for (const x of AUTUMN) { a += x.share; if (k <= a) { s = x; break; } }
  return new THREE.Color(hex(s.mix[0])).lerp(new THREE.Color(hex(s.mix[1])), s.mix[2]).multiplyScalar(s.power);
};

export const build: PartFactory = async ({ query }) => {
  const [file, map] = await Promise.all([load(FILES.mesh), leaves()]);
  const group = new THREE.Group(), made: { dispose(): void }[] = [];
  const kept = TREES.filter(([x, z, size]) => within(x, z) >= size);
  const rnd = seeded(4049);
  // The way a tree's shade lies on the ground: away from the moon.
  const away = new THREE.Vector2(-MOONWARD[0], -MOONWARD[2]).normalize();

  // Which model each tree is: the cheap one where a tree in front hides it, and otherwise not the model of the
  // nearest tree already given one.
  const hidden = kept.map(([x, z, s]) => kept.some(([ox, oz, os]) => os >= s * HIDDEN.big && oz - z > HIDDEN.front * s && Math.abs(ox - x) < HIDDEN.across * (s + os)));
  const order = kept.map((_, i) => i).sort((a, b) => kept[a][0] - kept[b][0]), modelOf = new Array<number>(kept.length).fill(-1);
  for (const i of order) {
    if (hidden[i]) { modelOf[i] = FAR; continue; }
    const [x, z] = kept[i];
    let nearest = -1, best = Infinity;
    for (let j = 0; j < kept.length; j++) if (j !== i && modelOf[j] >= 0 && modelOf[j] !== FAR) { const d = Math.hypot(kept[j][0] - x, kept[j][1] - z); if (d < best) { best = d; nearest = j; } }
    const pick = (k: number) => { let a = 0; for (const n of NEAR) { a += n.share; if (k <= a) return n.model; } return NEAR[0].model; };
    let m = pick(((kept[i][3] * 7.31 + kept[i][4] * 0.377) % 1 + 1) % 1);
    if (nearest >= 0 && modelOf[nearest] === m) m = NEAR[(NEAR.findIndex((n) => n.model === m) + 1 + (kept[i][3] > 0.5 ? 1 : 0)) % NEAR.length].model;
    modelOf[i] = m;
  }

  const byModel: { m: THREE.Matrix4; tone: THREE.Color; tree: [number, number, number, number] }[][] = MODELS.map(() => []);
  kept.forEach(([x, z, size, , turn], i) => {
    let behind = 0, cover = 0;
    for (const [bx, bz, w, , tall] of TOWERS) if (bz < z - 4 && z - bz < BEHIND.deep && Math.abs(bx - x) < w / 2 + BEHIND.side) behind += tall * (1 - (z - bz) / BEHIND.deep);
    for (const [ox, oz, os] of kept) {
      const dx = ox - x, dz = oz - z, along = -(dx * away.x + dz * away.y), off = Math.abs(dx * away.y - dz * away.x);
      if (along <= 0 || along > SHADED.far * (size + os) || off > SHADED.side * (size + os)) continue;
      cover = Math.max(cover, (SHADED.top * os - SHADED.drop * along) / (SHADED.top * size) * (1 - off / (SHADED.side * (size + os))) ** 0.5);
    }
    const shade = shadeOf(rnd()).multiplyScalar(1 + DIFFER.light * (2 * rnd() - 1));
    const s = size * (1 + DIFFER.size * (2 * rnd() - 1)), tall = DIFFER.tall[0] + (DIFFER.tall[1] - DIFFER.tall[0]) * rnd();
    // How much of its shade's reach stays on the land.
    let room = 1;
    for (let k = 1; k <= 16; k++) { const t = (k / 16) * SHADE.reach * s; if (within(x + away.x * t, z + away.y * t) < EDGE * s) { room = (k - 1) / 16; break; } }
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, ground(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn), new THREE.Vector3(s, s * tall, s));
    byModel[modelOf[i]].push({ m, tone: shade, tree: [rnd(), Math.min(1, behind / BEHIND.full), Math.min(1, Math.max(0, cover)), room] });
  });

  const uniforms = treeUniforms();
  uniforms.uShade.value.copy(away);
  const passes = [treeMaterial(map, 0, uniforms, query.get('treelook')), treeMaterial(map, 1, uniforms, query.get('treelook'))], depth = treeDepth(map, uniforms);
  made.push(passes[0], passes[1], depth);
  let cube = 1;
  for (let k = 0; k < MODELS.length; k++) {
    const l = file.meshes.get(`tree-${k}`), trees = byModel[k];
    if (!l || !trees.length) continue;
    cube = l.size;
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
      const mesh = new THREE.InstancedMesh(i === 0 ? g : soft, p, n);
      mesh.instanceMatrix = at;
      mesh.castShadow = i === 0;
      mesh.receiveShadow = false;
      mesh.customDepthMaterial = depth;
      mesh.renderOrder = i;
      mesh.matrixAutoUpdate = false;
      mesh.computeBoundingSphere();
      group.add(mesh);
    });
  }
  // How far the leaves move and the clumps are moved, in the shares of its own cube a model's positions are in: the
  // same for every model, whose cube the shade on the ground sets.
  uniforms.uAir.value = AIR.reach / cube;
  uniforms.uJitter.value = JITTER / cube;

  const front = kept.reduce((a, b) => (b[1] - Math.abs(b[0]) * 0.2 > a[1] - Math.abs(a[0]) * 0.2 ? b : a), kept[0] ?? [0, 0, 8, 0, 0]);
  const [x0, z0, s0] = front;
  return {
    group,
    // Seen alone, so many crowns round a tree at the front of the belt (?trees=16 is about as close as three times
    // the page's size).
    alone: { at: [x0, ground(x0, z0) + s0 * 1.2, z0], r: s0 * (Number(query.get('trees')) || 6) },
    update(s) {
      uniforms.uTime.value = s.still ? 0 : s.t;
      return true;
    },
    dispose() { for (const d of made) d.dispose(); release(map); },
  };
};
