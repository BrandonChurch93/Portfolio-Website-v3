import * as THREE from 'three';
import { hex, type PaletteName } from '../../../config/palette';
import { D2R, MOONWARD, PYRAMID, ROW, drawn, ground, noise, pyramidal, seeded, within } from '../layout';
import { load } from '../files';
import type { PartFactory } from '../part';
import { TOWERS, TREES } from '../placed';
import { leaves, release } from './trees/atlas';
import { CROWN, DRAWN, FAR, FILES, MODELS, SHADE } from './trees/design';
import { AIR, JITTER, treeDepth, treeMaterial, treeUniforms } from './trees/material';

// The trees: the belt along the city's front and the few among the buildings, each where TREES has it (./placed.ts)
// and as wide. Models of one kind of tree, made ahead by scripts/world/parts/trees/ with their stored light, each
// drawn for many trees at once with a place, a turn, a size, a height, a shade and a number of its own. A crown the
// fixed view cannot see past nearer crowns and buildings is left out, and one mostly hidden is drawn with the cheap
// model (VIEWED). A tree whose ground the tear took is left out.
// Each stands on the land as it is drawn (the make script stores where, from the land's own field): a tree on a
// dune stands on the dune, and one whose crown a crest in front of it mostly hides is left out, since a tuft over a
// crest reads as cut off.

// The autumn, from the deepest red brown to a pale amber cream, as picture 9's belt has it: one crown pale, its
// neighbour deep brown, the next copper. Every shade leans to the picture's orange copper: a cream mixed toward the
// palette's pale read grey pink beside it, and the browns read as pebbles. Each shade a mix of two of the palette's colors, how bright a leaf of it is, and how many
// of the trees wear it, in order: a tree's own number (TREES' tone) picks its place along the list, so about one
// crown in five is deep and one in five pale, and neighbours differ as their numbers do.
const AUTUMN: readonly { mix: readonly [PaletteName, PaletteName, number]; power: number; share: number }[] = [
  { mix: ['bronze-deep', 'ember', 0.2], power: 1.75, share: 0.18 },
  { mix: ['bronze', 'ember', 0.2], power: 1.4, share: 0.17 },
  { mix: ['bronze', 'copper', 0.35], power: 1.0, share: 0.17 },
  { mix: ['copper', 'bronze', 0.2], power: 0.95, share: 0.16 },
  { mix: ['copper', 'copper-light', 0.4], power: 0.92, share: 0.16 },
  { mix: ['copper-light', 'hot', 0.3], power: 0.92, share: 0.16 },
];// How much one tree differs from the next of its shade in brightness, in size and in height against its width, and
// how far it leans (the shear of its height to one side).
const DIFFER = { light: 0.12, size: 0.14, tall: [0.85, 1.16], lean: 0.06 } as const;
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
// What the fixed view sees of each crown, worked out once from where things are drawn (drawn() in layout.ts), on a
// grid of the host's units: a crown is an ellipse on the screen, its middle this high over its foot and this wide
// and tall (in its model's units, as the models are drawn), and the crowns nearer the viewer and the buildings
// wholly nearer cover it. A crown hides what is behind it only inside `solid` of its ellipse, since its outline is
// ragged and lets the next through. A crown of which under `least` is seen is not drawn (well under the tenth
// the brief allows, since an ellipse is not quite the crown), and one of which under
// `back` is seen takes the cheap model. ?treecull=0 draws every crown, to check that none of those left out shows.
const VIEWED = { up: 0.9, wide: 0.95, tall: 0.8, solid: 0.82, least: 0.04, back: 0.25 } as const;
// The city behind a tree: how far behind it and to each side a building is counted, and how tall the buildings
// behind have to be together for its outline to be lit in full.
const BEHIND = { deep: 260, side: 26, full: 260 };
// The moon's shade from the trees nearer it: how far toward the moon a tree is looked for (in the two trees' sizes
// together) and how near its line, how far a crown's shade drops for each unit it falls (the moon is 27 degrees
// up), and how high a crown's top stands in its own sizes. A tree's crown is in that shade up to the highest any
// of them reaches on it, as a share of its height, and never past `most` of it: a crown lets the moon through its
// gaps, and picture 9 has the top of every crown in the belt lit. The trees take no shade of the moon's from its
// shadow map: the towers behind would cover the whole belt.
const SHADED = { far: 3, side: 0.7, drop: 0.52, top: 2, most: 0.4 };
// The shade on the ground is cut where it would pass this far inside the land's edge, in the tree's sizes.
const EDGE = 0.4;
// A tree is drawn only if at least this share of its crown is seen over the land in front of it.
const SEEN = 0.65;
// The pyramid's court in front of it, to the right of its front corner (across from its middle and toward the viewer,
// in units): picture 9 has bare broken ground there, and the few trees the plan stands on it read as lone puffs on
// the apron, so they are let go.
const APRON = { across: [0, 160], toward: 100 } as const;
// The moon's shade from the buildings and the pyramid: how many places up a crown are looked from toward the moon,
// how far a building is looked for, the step of the march over the pyramid, and how high a crown stands in its
// own sizes. A crown is in that shade up to the highest of those places a building hides from the moon, as with
// the trees': so a tree in the street's shade is not lit as if it stood in the open. The trees take no shade from
// the moon's shadow map (above), so this is how they agree with the paving at their feet.
// Never past `most` of a crown: picture 9 has the tops of the belt left of the pyramid lit as the rest are, though
// the pyramid stands between them and the moon.
const STREET = { heights: 7, far: 700, step: 3, top: 2.1, most: 0.15 };

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

// Which crowns the fixed view sees, and which of those are mostly hidden (VIEWED).
type Placed = readonly [number, number, number, number, number];
function viewed(trees: readonly Placed[], tall: readonly number[], seat: (x: number, z: number) => { y: number }): { kept: number[]; back: boolean[] } {
  const discs = trees.map(([x, z, s], i) => {
    const g = seat(x, z).y, h = s * tall[i], [cx, cy] = drawn(x, g + VIEWED.up * h, z), [ex] = drawn(x + VIEWED.wide * s, g + VIEWED.up * h, z), [, ty] = drawn(x, g + (VIEWED.up + VIEWED.tall) * h, z);
    return { cx, cy, rx: Math.abs(ex - cx), ry: Math.abs(cy - ty), z };
  });
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const d of discs) { x0 = Math.min(x0, d.cx - d.rx); x1 = Math.max(x1, d.cx + d.rx); y0 = Math.min(y0, d.cy - d.ry); y1 = Math.max(y1, d.cy + d.ry); }
  x0 = Math.floor(x0) - 1; y0 = Math.floor(y0) - 1;
  const W = Math.max(1, Math.ceil(x1) - x0 + 2), H = Math.max(1, Math.ceil(y1) - y0 + 2);
  // The nearest building wholly in front of each place of the grid, by its far side, and whether a nearer crown
  // already covers it.
  const wall = new Float32Array(W * H).fill(-Infinity), held = new Uint8Array(W * H);
  for (const [bx, bz, w, d, tall, turn] of TOWERS) {
    const c = Math.cos(turn * D2R), sn = Math.sin(turn * D2R), base = ground(bx, bz), pts: [number, number][] = [];
    let far = Infinity;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (const h of [0, tall]) {
      const x = bx + (a * w * c + b * d * sn) / 2, z = bz + (-a * w * sn + b * d * c) / 2;
      pts.push(drawn(x, base + h, z)); far = Math.min(far, z);
    }
    const hull = convex(pts);
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const [px, py] of hull) { a0 = Math.min(a0, px); a1 = Math.max(a1, px); b0 = Math.min(b0, py); b1 = Math.max(b1, py); }
    for (let gy = Math.max(0, Math.floor(b0 - y0)); gy < Math.min(H, Math.ceil(b1 - y0)); gy++) for (let gx = Math.max(0, Math.floor(a0 - x0)); gx < Math.min(W, Math.ceil(a1 - x0)); gx++) {
      if (!inside(hull, gx + x0 + 0.5, gy + y0 + 0.5)) continue;
      const i = gy * W + gx;
      wall[i] = Math.max(wall[i], far);
    }
  }
  const order = discs.map((_, i) => i).sort((a, b) => discs[b].z - discs[a].z), share = new Float32Array(discs.length);
  for (const i of order) {
    const t = discs[i];
    let all = 0, seen = 0;
    const box = [Math.max(0, Math.floor(t.cx - t.rx - x0)), Math.min(W, Math.ceil(t.cx + t.rx - x0)), Math.max(0, Math.floor(t.cy - t.ry - y0)), Math.min(H, Math.ceil(t.cy + t.ry - y0))];
    for (let gy = box[2]; gy < box[3]; gy++) for (let gx = box[0]; gx < box[1]; gx++) {
      const u = (gx + x0 + 0.5 - t.cx) / t.rx, v = (gy + y0 + 0.5 - t.cy) / t.ry, e = u * u + v * v;
      if (e > 1) continue;
      const k = gy * W + gx;
      all++;
      if (!held[k] && wall[k] <= t.z) seen++;
    }
    share[i] = all ? seen / all : 0;
    for (let gy = box[2]; gy < box[3]; gy++) for (let gx = box[0]; gx < box[1]; gx++) {
      const u = (gx + x0 + 0.5 - t.cx) / t.rx, v = (gy + y0 + 0.5 - t.cy) / t.ry;
      if (u * u + v * v <= VIEWED.solid * VIEWED.solid) held[gy * W + gx] = 1;
    }
  }
  const kept: number[] = [], back: boolean[] = [];
  trees.forEach((_, i) => {
    if (share[i] < VIEWED.least) return;
    kept.push(i);
    back.push(share[i] < VIEWED.back);
  });
  return { kept, back };
}
// The convex outline of points on the screen, and whether a place is inside it.
function convex(p: [number, number][]): [number, number][] {
  const s = [...p].sort((a, b) => a[0] - b[0] || a[1] - b[1]), turn = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [], hi: [number, number][] = [];
  for (const q of s) { while (lo.length > 1 && turn(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of [...s].reverse()) { while (hi.length > 1 && turn(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
function inside(h: [number, number][], x: number, y: number): boolean {
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false;
  }
  return h.length > 2;
}

const shadeOf = (k: number): THREE.Color => {
  let a = 0, s = AUTUMN[AUTUMN.length - 1];
  for (const x of AUTUMN) { a += x.share; if (k <= a) { s = x; break; } }
  return new THREE.Color(hex(s.mix[0])).lerp(new THREE.Color(hex(s.mix[1])), s.mix[2]).multiplyScalar(s.power);
};
// ?trees=off builds no trees, so a page's cost can be measured with and without them. It still counts as built (an
// empty thing in its group), or the frame draws its stand ins in their place.
const OFF = 'off';

export const build: PartFactory = async ({ query }) => {
  if (query.get('trees') === OFF) return { group: new THREE.Group().add(new THREE.Object3D()) };
  const [file, map] = await Promise.all([load(FILES.mesh), leaves()]);
  const group = new THREE.Group(), made: { dispose(): void }[] = [];
  const seats = new Map(((file.meta.seats ?? []) as number[][]).map(([x, z, y, sand, seen]) => [`${x},${z}`, { y, sand, seen }]));
  const seat = (x: number, z: number) => seats.get(`${x},${z}`) ?? { y: ground(x, z), sand: 0, seen: 1 };
  // Every size below is the model's: half the drawn width (DRAWN).
  const apron = (x: number, z: number) => x - PYRAMID.x > APRON.across[0] && x - PYRAMID.x < APRON.across[1] && z - PYRAMID.z > APRON.toward;
  const ground0 = TREES.filter(([x, z, size]) => within(x, z) >= size * DRAWN && seat(x, z).seen >= SEEN && !apron(x, z)).map(([x, z, size, tone, turn]) => [x, z, size * DRAWN, tone, turn] as const);
  // Each tree's own size, height and the rest are its own (a seed of its own numbers), and are worked out before
  // the view is, so what is left out is judged at the size it would be drawn and does not change with the list.
  const rel = ground0.map(([x, z, s]) => {
    let n = 0, sum = 0;
    for (const [ox, oz, os] of ground0) if (Math.hypot(ox - x, oz - z) < KIND.round * s) { n++; sum += os; }
    return n ? s / (sum / n) : 1;
  });
  const own = ground0.map(([, , size, tone, turn], i) => {
    const r = seeded((Math.round(tone * 1e6) * 7919) ^ Math.round(turn * 1e5));
    const light = 1 + DIFFER.light * (2 * r() - 1), s = size * (1 + DIFFER.size * (2 * r() - 1));
    const stand = Math.min(DIFFER.tall[1], Math.max(DIFFER.tall[0], 1 + STANDS * (rel[i] - 1) + 0.24 * (r() - 0.5)));
    return { light, s, stand, rel: rel[i], la: r() * Math.PI * 2, lean: DIFFER.lean * r(), id: r() };
  });
  const sized = ground0.map(([x, z, , tone, turn], i) => [x, z, own[i].s, tone, turn] as const);
  const look = query.get('treecull') === '0' ? { kept: sized.map((_, i) => i), back: sized.map(() => false) } : viewed(sized, own.map((o) => o.stand), seat);
  const kept = look.kept.map((i) => sized[i]), mine = look.kept.map((i) => own[i]), back = look.back;
  if (query.get('treecount')) console.error(`trees: ${TREES.length} planned, ${ground0.length} with ground, ${kept.length} drawn, ${back.filter(Boolean).length} far, ${kept.filter((t) => t[1] === ROW.z).length} of the ${TREES.filter((t) => t[1] === ROW.z).length} behind the dunes`);
  // The way a tree's shade lies on the ground: away from the moon.
  const away = new THREE.Vector2(-MOONWARD[0], -MOONWARD[2]).normalize();

  // Which model each tree is: the cheap one where a tree in front hides it, and otherwise not the model of the
  // nearest tree already given one.
  const hidden = back;
  const order = kept.map((_, i) => i).sort((a, b) => kept[a][0] - kept[b][0]), modelOf = new Array<number>(kept.length).fill(-1);
  const relOf = mine.map((o) => o.rel);
  for (const i of order) {
    if (hidden[i]) { modelOf[i] = FAR; continue; }
    const [x, z] = kept[i];
    let nearest = -1, best = Infinity;
    for (let j = 0; j < kept.length; j++) if (j !== i && modelOf[j] >= 0 && modelOf[j] !== FAR) { const d = Math.hypot(kept[j][0] - x, kept[j][1] - z); if (d < best) { best = d; nearest = j; } }
    const list = relOf[i] > KIND.over ? KIND.big : relOf[i] < KIND.under ? KIND.small : KIND.all;
    const k = Math.min(list.length - 1, Math.floor(Math.min(0.999, Math.max(0, (noise(x / PLACE, z / PLACE, 0, 31) - 0.25) * 2)) * list.length));
    let m = list[k];
    if (nearest >= 0 && modelOf[nearest] === m) m = list[(k + 1) % list.length];
    modelOf[i] = m;
  }

  const byModel: { m: THREE.Matrix4; tone: THREE.Color; tree: [number, number, number, number]; reach: number[] }[][] = MODELS.map(() => []);
  kept.forEach(([x, z, size, tone, turn], i) => {
    let behind = 0, cover = 0;
    for (const [bx, bz, w, , tall] of TOWERS) if (bz < z - 4 && z - bz < BEHIND.deep && Math.abs(bx - x) < w / 2 + BEHIND.side) behind += tall * (1 - (z - bz) / BEHIND.deep);
    for (const [ox, oz, os] of kept) {
      const dx = ox - x, dz = oz - z, along = -(dx * away.x + dz * away.y), off = Math.abs(dx * away.y - dz * away.x);
      if (along <= 0 || along > SHADED.far * (size + os) || off > SHADED.side * (size + os)) continue;
      cover = Math.max(cover, (SHADED.top * os - SHADED.drop * along) / (SHADED.top * size) * (1 - off / (SHADED.side * (size + os))) ** 0.5);
    }
    cover = Math.min(cover, SHADED.most);
    const shade = shadeOf(tone).multiplyScalar(mine[i].light), s = size, stand = mine[i].stand;
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
    const { la, lean } = mine[i];
    const m = new THREE.Matrix4().makeTranslation(x, g, z).multiply(new THREE.Matrix4().set(1, Math.cos(la) * lean, 0, 0, 0, 1, 0, 0, 0, Math.sin(la) * lean, 1, 0, 0, 0, 0, 1))
      .multiply(new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn), new THREE.Vector3(s, s * tall, s)));
    byModel[modelOf[i]].push({ m, tone: shade, tree: [mine[i].id, Math.min(1, behind / BEHIND.full), Math.min(1.2, Math.max(0, cover)), room], reach });
  });

  const uniforms = treeUniforms();
  uniforms.uShade.value.copy(away);
  // The pyramid's face toward the moon and the visitor, and the middle of its light (a third of the way in from its
  // foot and up its height), which lights the crowns in front of it.
  {
    const k = Math.sin(PYRAMID.turn * D2R), c = Math.cos(PYRAMID.turn * D2R), out = PYRAMID.base / 3;
    uniforms.uGold.value.set(PYRAMID.x + k * out, ground(PYRAMID.x, PYRAMID.z) + PYRAMID.tall / 3, PYRAMID.z + c * out, 1);
    uniforms.uGoldN.value.set(k, c);
  }
  const passes = [treeMaterial(map, 0, uniforms, query.get('treelook')), treeMaterial(map, 1, uniforms, query.get('treelook'))], depth = treeDepth(map, uniforms);
  made.push(passes[0], passes[1], depth);
  let cube = 1;
  for (let k = 0; k < MODELS.length; k++) {
    const l = file.meshes.get(`tree-${k}`), trees = byModel[k];
    if (!l || !trees.length) continue;
    cube = l.size;
    // The first pass draws the leaves and the bark, the second only what has soft edges (which the make script put
    // after the bark), and the shade on the ground (put last) is drawn before either, by the second pass's material:
    // drawn after the trunk, the shade, which stands nearer the viewer than the ground it lies on, darkened the
    // trunk's foot and left a black band between the crown and the ground.
    const g = l.geometry, from = Number(l.info.soft ?? 0), shade = Number(l.info.shade ?? 0) * 3, n = trees.length, own = new THREE.Matrix4().compose(l.at, new THREE.Quaternion(), new THREE.Vector3().setScalar(l.size));
    const at = new THREE.InstancedBufferAttribute(new Float32Array(n * 16), 16), tone = new Float32Array(n * 3), tree = new Float32Array(n * 4), reach = new Float32Array(n * 4), m = new THREE.Matrix4();
    trees.forEach((t, i) => { m.multiplyMatrices(t.m, own).toArray(at.array, i * 16); tone.set([t.tone.r, t.tone.g, t.tone.b], i * 3); tree.set(t.tree, i * 4); reach.set(t.reach, i * 4); });
    g.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 3));
    g.setAttribute('aTree', new THREE.InstancedBufferAttribute(tree, 4));
    g.setAttribute('aReach', new THREE.InstancedBufferAttribute(reach, 4));
    const index = g.getIndex();
    if (!index) continue;
    const end = index.count - shade;
    const part = (a: number, b: number): THREE.BufferGeometry => {
      const p = new THREE.BufferGeometry();
      for (const [name, x] of Object.entries(g.attributes)) p.setAttribute(name, x);
      p.setIndex(new THREE.BufferAttribute(index.array.subarray(a, b), 1));
      p.boundingBox = g.boundingBox;
      p.boundingSphere = g.boundingSphere;
      made.push(p);
      return p;
    };
    made.push(g);
    for (const [geometry, material, order] of [[part(0, end), passes[0], 0], [part(from, end), passes[1], 1], [part(end, index.count), passes[1], -1]] as const) {
      const mesh = new THREE.InstancedMesh(geometry, material, n);
      mesh.instanceMatrix = at;
      mesh.castShadow = order === 0;
      mesh.receiveShadow = false;
      mesh.customDepthMaterial = depth;
      mesh.renderOrder = order;
      mesh.matrixAutoUpdate = false;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
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
