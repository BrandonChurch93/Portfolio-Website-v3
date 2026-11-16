import * as THREE from 'three';
import { hex, type PaletteName } from '../../../config/palette';
import { D2R, MOONWARD, PYRAMID, ground, noise, pyramidal, seeded, within } from '../layout';
import { load } from '../files';
import type { PartFactory } from '../part';
import { TOWERS, TREES } from '../placed';
import { leaves, release } from './trees/atlas';
import { CROWN, DRAWN, FAR, FILES, MODELS, SHADE } from './trees/design';
import { AIR, JITTER, treeDepth, treeMaterial, treeUniforms } from './trees/material';

// The trees: the belt along the city's front and the few among the buildings, each where TREES has it (./placed.ts)
// and as wide. Models of one kind of tree, made ahead by scripts/world/parts/trees/ with their stored light, each
// drawn for many trees at once with a place, a turn, a size, a height, a shade and a number of its own. A tree most
// of which a tree in front of it hides is drawn with the cheap model. A tree whose ground the tear took is left out.
// Each stands on the land as it is drawn (the make script stores where, from the land's own field): a tree on a
// dune stands on the dune, and one whose crown a crest in front of it mostly hides is left out, since a tuft over a
// crest reads as cut off.

// The autumn, from the deepest brown to a pale cream, as picture 9's belt has it: one crown pale, its neighbour deep
// brown, the next amber. Each shade a mix of two of the palette's colors, how bright a leaf of it is, and how many
// of the trees wear it, in order: a tree's own number (TREES' tone) picks its place along the list, so about one
// crown in five is deep and one in five pale, and neighbours differ as their numbers do.
const AUTUMN: readonly { mix: readonly [PaletteName, PaletteName, number]; power: number; share: number }[] = [
  { mix: ['bronze-deep', 'bronze', 0.3], power: 1.2, share: 0.2 },
  { mix: ['bronze', 'bronze-deep', 0.45], power: 1.25, share: 0.15 },
  { mix: ['bronze', 'ember', 0.2], power: 1.05, share: 0.15 },
  { mix: ['copper', 'bronze', 0.35], power: 0.95, share: 0.15 },
  { mix: ['copper', 'copper-light', 0.4], power: 0.9, share: 0.15 },
  { mix: ['copper-light', 'pale', 0.15], power: 0.95, share: 0.2 },
];
// How much one tree differs from the next of its shade in brightness, in size and in height against its width, and
// how far it leans (the shear of its height to one side).
const DIFFER = { light: 0.12, size: 0.08, tall: [0.9, 1.1], lean: 0.06 } as const;
// The tall model is already taller than it is wide: it is stretched no further than this.
const SLENDER = 1.0;
// Which of the full models a tree in front is: a tree larger than those round it is tall or round and stands over
// them, a smaller one spreads or is two grown into one, and the rest change kind by place along the belt (a noise
// across the top, PLACE units to a patch), so the wood is not one crown repeated. How far round a tree its
// neighbours are counted (in its sizes), and how much larger or smaller than them it has to be.
const KIND = { big: [MODELS.indexOf('tall'), MODELS.indexOf('round')], small: [MODELS.indexOf('broad'), MODELS.indexOf('twin')], all: [MODELS.indexOf('round'), MODELS.indexOf('tall'), MODELS.indexOf('twin'), MODELS.indexOf('broad')], round: 3, over: 1.1, under: 0.9 } as const;
const PLACE = 90;
// How much taller a crown stands, against its width, for each share it is larger than its neighbours.
const STANDS = 0.5;
// A tree is hidden, and takes the cheap model, when one at least as big stands this far in front of it (in its own
// sizes) and this close to its line across.
const HIDDEN = { front: 0.35, across: 0.55, big: 0.85 };
// The city behind a tree: how far behind it and to each side a building is counted, and how tall the buildings
// behind have to be together for its outline to be lit in full.
const BEHIND = { deep: 260, side: 26, full: 260 };
// The moon's shade from the trees nearer it: how far toward the moon a tree is looked for (in the two trees' sizes
// together) and how near its line, how far a crown's shade drops for each unit it falls (the moon is 27 degrees
// up), and how high a crown's top stands in its own sizes. A tree's crown is in that shade up to the highest any
// of them reaches on it, as a share of its height, and never past `most` of it: a crown lets the moon through its
// gaps, and picture 9 has the top of every crown in the belt lit. The trees take no shade of the moon's from its
// shadow map: the towers behind would cover the whole belt.
const SHADED = { far: 3, side: 0.7, drop: 0.52, top: 2, most: 0.55 };
// The shade on the ground is cut where it would pass this far inside the land's edge, in the tree's sizes.
const EDGE = 0.4;
// A tree is drawn only if at least this share of its crown is seen over the land in front of it.
const SEEN = 0.65;
// The moon's shade from the buildings and the pyramid: how many places up a crown are looked from toward the moon,
// how far a building is looked for, the step of the march over the pyramid, and how high a crown stands in its
// own sizes. A crown is in that shade up to the highest of those places a building hides from the moon, as with
// the trees': so a tree in the street's shade is not lit as if it stood in the open. The trees take no shade from
// the moon's shadow map (above), so this is how they agree with the paving at their feet.
// Never past `most` of a crown: picture 9 has the tops of the belt left of the pyramid lit as the rest are, though
// the pyramid stands between them and the moon.
const STREET = { heights: 7, far: 700, step: 3, top: 2.1, most: 0.6 };

// Whether a ray from p toward the moon is stopped by a building, or by the pyramid.
const moon = new THREE.Vector3(...MOONWARD).normalize();
function blocked(px: number, py: number, pz: number): boolean {
  for (const [bx, bz, w, d, tall, turn] of TOWERS) {
    const dx = bx - px, dz = bz - pz;
    if (dx * dx + dz * dz > STREET.far * STREET.far) continue;
    const c = Math.cos(turn * D2R), s = Math.sin(turn * D2R), base = ground(bx, bz) - 2;
    // Into the building's own frame, then the slabs of its box.
    const ox = -dx * c + dz * s, oz = -dx * s - dz * c, oy = py - base, rx = moon.x * c - moon.z * s, rz = moon.x * s + moon.z * c;
    let t0 = 0, t1 = STREET.far;
    for (const [o, r, h0, h1] of [[ox, rx, -w / 2, w / 2], [oy, moon.y, 0, tall], [oz, rz, -d / 2, d / 2]] as const) {
      if (Math.abs(r) < 1e-6) { if (o < h0 || o > h1) { t1 = -1; break; } continue; }
      const a = (h0 - o) / r, b = (h1 - o) / r;
      t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
      if (t0 > t1) break;
    }
    if (t0 <= t1 && t1 > 0) return true;
  }
  if (Math.hypot(px - PYRAMID.x, pz - PYRAMID.z) < PYRAMID.base * 2.4) {
    const g = ground(PYRAMID.x, PYRAMID.z);
    for (let t = STREET.step; py + moon.y * t < g + PYRAMID.tall; t += STREET.step) {
      const [a, b] = pyramidal(px + moon.x * t, pz + moon.z * t), m = Math.max(Math.abs(a), Math.abs(b)) / (PYRAMID.base / 2);
      if (m < 1 && py + moon.y * t < g + PYRAMID.tall * (1 - m)) return true;
    }
  }
  return false;
}

const shadeOf = (k: number): THREE.Color => {
  let a = 0, s = AUTUMN[AUTUMN.length - 1];
  for (const x of AUTUMN) { a += x.share; if (k <= a) { s = x; break; } }
  return new THREE.Color(hex(s.mix[0])).lerp(new THREE.Color(hex(s.mix[1])), s.mix[2]).multiplyScalar(s.power);
};
// ?trees=off builds no trees, so a page's cost can be measured with and without them.
const OFF = 'off';

export const build: PartFactory = async ({ query }) => {
  if (query.get('trees') === OFF) return { group: new THREE.Group() };
  const [file, map] = await Promise.all([load(FILES.mesh), leaves()]);
  const group = new THREE.Group(), made: { dispose(): void }[] = [];
  const seats = new Map(((file.meta.seats ?? []) as number[][]).map(([x, z, y, sand, seen]) => [`${x},${z}`, { y, sand, seen }]));
  const seat = (x: number, z: number) => seats.get(`${x},${z}`) ?? { y: ground(x, z), sand: 0, seen: 1 };
  // Every size below is the model's: half the drawn width (DRAWN).
  const kept = TREES.filter(([x, z, size]) => within(x, z) >= size * DRAWN && seat(x, z).seen >= SEEN).map(([x, z, size, tone, turn]) => [x, z, size * DRAWN, tone, turn] as const);
  const rnd = seeded(4049);
  // The way a tree's shade lies on the ground: away from the moon.
  const away = new THREE.Vector2(-MOONWARD[0], -MOONWARD[2]).normalize();

  // Which model each tree is: the cheap one where a tree in front hides it, and otherwise not the model of the
  // nearest tree already given one.
  const hidden = kept.map(([x, z, s]) => kept.some(([ox, oz, os]) => os >= s * HIDDEN.big && oz - z > HIDDEN.front * s && Math.abs(ox - x) < HIDDEN.across * (s + os)));
  const order = kept.map((_, i) => i).sort((a, b) => kept[a][0] - kept[b][0]), modelOf = new Array<number>(kept.length).fill(-1);
  const rel = kept.map(([x, z, s]) => {
    let n = 0, sum = 0;
    for (const [ox, oz, os] of kept) if (Math.hypot(ox - x, oz - z) < KIND.round * s) { n++; sum += os; }
    return n ? s / (sum / n) : 1;
  });
  for (const i of order) {
    if (hidden[i]) { modelOf[i] = FAR; continue; }
    const [x, z] = kept[i];
    let nearest = -1, best = Infinity;
    for (let j = 0; j < kept.length; j++) if (j !== i && modelOf[j] >= 0 && modelOf[j] !== FAR) { const d = Math.hypot(kept[j][0] - x, kept[j][1] - z); if (d < best) { best = d; nearest = j; } }
    const list = rel[i] > KIND.over ? KIND.big : rel[i] < KIND.under ? KIND.small : KIND.all;
    const k = Math.min(list.length - 1, Math.floor(Math.min(0.999, Math.max(0, (noise(x / PLACE, z / PLACE, 0, 31) - 0.25) * 2)) * list.length));
    let m = list[k];
    if (nearest >= 0 && modelOf[nearest] === m) m = list[(k + 1) % list.length];
    modelOf[i] = m;
  }

  const byModel: { m: THREE.Matrix4; tone: THREE.Color; tree: [number, number, number, number]; reach: number[] }[][] = MODELS.map(() => []);
  kept.forEach(([x, z, size, own, turn], i) => {
    let behind = 0, cover = 0;
    for (const [bx, bz, w, , tall] of TOWERS) if (bz < z - 4 && z - bz < BEHIND.deep && Math.abs(bx - x) < w / 2 + BEHIND.side) behind += tall * (1 - (z - bz) / BEHIND.deep);
    for (const [ox, oz, os] of kept) {
      const dx = ox - x, dz = oz - z, along = -(dx * away.x + dz * away.y), off = Math.abs(dx * away.y - dz * away.x);
      if (along <= 0 || along > SHADED.far * (size + os) || off > SHADED.side * (size + os)) continue;
      cover = Math.max(cover, (SHADED.top * os - SHADED.drop * along) / (SHADED.top * size) * (1 - off / (SHADED.side * (size + os))) ** 0.5);
    }
    cover = Math.min(cover, SHADED.most);
    const shade = shadeOf(own).multiplyScalar(1 + DIFFER.light * (2 * rnd() - 1));
    const s = size * (1 + DIFFER.size * (2 * rnd() - 1)), stand = Math.min(DIFFER.tall[1], Math.max(DIFFER.tall[0], 1 + STANDS * (rel[i] - 1) + 0.24 * (rnd() - 0.5)));
    const tall = modelOf[i] === MODELS.indexOf('tall') ? Math.min(stand, SLENDER) : stand;
    const { y: g, sand } = seat(x, z);
    for (let k = STREET.heights - 1; k >= 0; k--) {
      const share = k / (STREET.heights - 1), h = s * tall * (CROWN.clear + (STREET.top - CROWN.clear) * share);
      if (blocked(x, g + h, z)) { cover = Math.max(cover, Math.min(STREET.most, share + 0.2)); break; }
    }
    // How much of its shade's reach stays on the land, and how far the land goes behind the trunk and to each side of
    // the shade's line (in crown units), where the shade is cut.
    let room = 1;
    for (let k = 1; k <= 16; k++) { const t = (k / 16) * SHADE.reach * s; if (within(x + away.x * t, z + away.y * t) < EDGE * s) { room = (k - 1) / 16; break; } }
    const side = new THREE.Vector2(-away.y, away.x), reach = [[-away.x, -away.y, SHADE.back], [-side.x, -side.y, SHADE.wide], [side.x, side.y, SHADE.wide]].map(([dx, dz, most]) => {
      for (let k = 1; k <= 16; k++) { const t = (k / 16) * most * s; if (within(x + dx * t, z + dz * t) < EDGE * s) return ((k - 1) / 16) * most; }
      return most + 1;
    });
    reach.push(sand);
    const la = rnd() * Math.PI * 2, lean = DIFFER.lean * rnd();
    const m = new THREE.Matrix4().makeTranslation(x, g, z).multiply(new THREE.Matrix4().set(1, Math.cos(la) * lean, 0, 0, 0, 1, 0, 0, 0, Math.sin(la) * lean, 1, 0, 0, 0, 0, 1))
      .multiply(new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn), new THREE.Vector3(s, s * tall, s)));
    byModel[modelOf[i]].push({ m, tone: shade, tree: [rnd(), Math.min(1, behind / BEHIND.full), Math.min(1.2, Math.max(0, cover)), room], reach });
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
    const at = new THREE.InstancedBufferAttribute(new Float32Array(n * 16), 16), tone = new Float32Array(n * 3), tree = new Float32Array(n * 4), reach = new Float32Array(n * 4), m = new THREE.Matrix4();
    trees.forEach((t, i) => { m.multiplyMatrices(t.m, own).toArray(at.array, i * 16); tone.set([t.tone.r, t.tone.g, t.tone.b], i * 3); tree.set(t.tree, i * 4); reach.set(t.reach, i * 4); });
    g.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 3));
    g.setAttribute('aTree', new THREE.InstancedBufferAttribute(tree, 4));
    g.setAttribute('aReach', new THREE.InstancedBufferAttribute(reach, 4));
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
  uniforms.uCube.value = cube;

  const front = kept.reduce((a, b) => (b[1] - Math.abs(b[0]) * 0.2 > a[1] - Math.abs(a[0]) * 0.2 ? b : a), kept[0] ?? ([0, 0, 4, 0, 0] as const));
  const [x0, z0, s0] = front;
  return {
    group,
    // Seen alone, so many crowns round a tree at the front of the belt (?trees=32 is about as close as three times
    // the page's size).
    alone: { at: [x0, seat(x0, z0).y + s0, z0], r: s0 * (Number(query.get('trees')) || 6) },
    update(s) {
      uniforms.uTime.value = s.still ? 0 : s.t;
      return true;
    },
    dispose() { for (const d of made) d.dispose(); release(map); },
  };
};
