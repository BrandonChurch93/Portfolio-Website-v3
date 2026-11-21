import * as THREE from 'three';
import { slice } from '../../../world/build';
import { CORE, DEBRIS, LIGHT, MOONWARD, SCALE, SMALL, fromPicture } from '../layout';
import { STONE, STONE_VERT_PARS, stoneMaps, stoneShader } from './rock/stone';
import { color, lit, stone } from '../light';
import { load } from '../files';
import type { PartFactory } from '../part';
import { KIND } from './debris/motion';
import { COLUMNS, LOOK as DRAWN, MOON_SHARE } from './debris/table';
import * as S from './debris/shaders';

// What broke away: the pieces of the planet that hang under it, caught in its gravity, as one scene. The field is
// the original plan's (scripts/world/debris-plan.json), made by scripts/world/parts/debris/make.mjs into
// public/world/debris.bin: some fifty rock models, and a table of every piece, which model it wears, where it
// rests, how it is turned and how it moves (./debris/motion.ts). Here every piece is laid into one mesh, each vertex
// knowing its piece, and the table goes to the graphics card as a texture that is written once. The vertex shader
// moves every piece from the clock alone, so nothing is written after the part is made, and Safari keeps nothing.
// Every piece is the planet's stone (./rock/stone.ts), the hollow's own body, grain, stains and knapped relief.
// ?debris=models lays each model out once in a row under a plain light, to be looked at alone, and &model=G9 shows
// that one alone. ?debrisshow=1 to 8 draws one number the shader works with in place of the light (see DEEP).

const LOOK = {
  // A flake's scar is fresh stone, the stone's own chip.
  chip: STONE.chip,
  // The planet's outer surface where a piece shows it: pale on the side the moon lights, dark on the other.
  skin: { pale: color('text-3').lerp(color('text-2'), 0.35).multiplyScalar(0.5), dark: color('bg-3').lerp(color('text-3'), 0.2) },
  // How much of the light the rock bounces reaches a piece, and of the core's light on its faces, and past what
  // distance, in units, that falls away as a further power.
  bounce: 0.1,
  core: 0.22,
  steep: [270, 2.6] as const,
  // The core's burning edge on a smaller piece: how bright, how tight to the outline, and how much a great piece's
  // broken edge turned to it catches.
  coreRim: [1.6, 5, 0.22] as const,
  // A great piece is lit by which way each face turns: the core's light on a face turned to it (a share of the
  // core's own strength, the distance in units past which it falls away, and how fast). The moon's is greatMoon.
  great: [0.12, 450, 1.5] as const,
  // How much of the core's light a great piece's broad faces take, and how much more its edges that stand out: the
  // picture's masses are dark with a lit broken rim.
  greatEdge: [0.6, 3] as const,
  // Picture 9's two boulders: how much of that core light they take, how much of the moon's the left one and the
  // right one take (the left one's top planes are pale in the picture, the right one is near black), and how much of
  // the core each place of theirs is taken to see at least.
  boulder: [2.2, 3, 0.25, 0.8] as const,
  // The right boulder is near black but for its crest: how much of that core light its body keeps, and its edges.
  crest: [0.08, 4] as const,
  // A great piece's tone across it: the darkest and lightest of its stains, how wide they are in units, and how dark
  // the stone is where it is most shut in.
  greatTone: [0.62, 1.18, 34, 0.45] as const,
  // How much of the night's soft light a great piece takes against a small one, and picture 9's two boulders.
  greatFill: [0.35, 1.6] as const,
  // A great piece's bedding, as bands of tone: how far apart the wider and finer layers are, in units, how much one
  // layer's tone differs from the next, wide and fine, and over how many units one eases into the next.
  beds: [14, 4.5, 0.22, 0.1] as const, bedEase: 1.2,
  // Its conchoidal breaks, larger than the rock's (STONE.roll): the larger's cell in units and depth, the smaller's.
  knap: [16, 1.4, 6.5, 0.6] as const,
  // The crumbled lip on a great piece's broken edges: a crumb's size in units, how far into an edge's bend it
  // reaches, and how pale and how dark its grains go.
  crumb: [1.7, 0.35, 0.55, 0.6] as const,
  // The moon on a great piece's faces turned to it: the share of its light, how much more its broken edges take, and
  // the share of its color the stone keeps under it (STONE.crust.moonChroma, as the rock's moonlit crust).
  greatMoon: [0.025, 4, STONE.crust.moonChroma] as const,
  // A smaller piece's light across it, on its side away from the core and toward it, and its own tone's swing.
  grade: [0.15, 1.25, 0.3] as const,
  // The moon: how much of its light a face turned to it keeps (it is behind the pieces), and its rim: how bright, how
  // wide in units (a rim thinner than about a unit and a half breaks into dashes), and how much of it is left where the
  // planet shades a smaller piece from the moon. A smaller piece takes it on its faces turned to the moon, each face
  // whole, this much of it, and most where the face is seen edge on: its edges stay sharp. Its color is the moon's
  // own, a little cooler.
  moonBody: 0.03,
  moonRim: [1.5, 2.2, 0.55, 0.45] as const,
  rimColor: color(LIGHT.moon.color, LIGHT.moon.power).multiply(color('text').lerp(color('text-2'), 0.3)),
  // The night's soft light on a body, from the visitor's side and above (in the camera's frame): its color and
  // strength, how much reaches a face turned from it, and where it comes from. It gives a body its form.
  fill: { color: color('pale').lerp(color('text-2'), 0.5).multiplyScalar(0.12), least: 0.12, from: [-0.35, 0.55, 0.75] as const },
  // The night's light on a piece, turned against the world's warm tint on rock (LIGHT.warm) to a warm neutral, and how
  // much of the night the rock mirrors.
  night: new THREE.Color(1 / LIGHT.warm[0], 1 / LIGHT.warm[1], 1 / LIGHT.warm[2]).multiply(color('pale')).multiplyScalar(0.2),
  mirror: 0.08,
  // How much paler a great piece's edge is where it stands out.
  worn: 0.45,
  // The stream's light: its color, how bright where it is full, over how many units it falls to half, how far it
  // reaches at all. The small streams: how bright, and over how many units.
  stream: { color: color('hot').lerp(color('flame'), 0.35), main: [7, 30, 200] as const, small: [2.6, 24] as const },
  // A flake the stream carries: how bright its edge toward the stream burns, how wide that edge is in units, and how
  // much of the stream's light its body keeps.
  carried: [7, 1.6, 0.25] as const,
  // The small streams are drawn over the world, so each lights what is drawn beside it: within this depth of its own,
  // as far as this many units from it, and an edge that stands out burns this much more.
  smallDepth: [340, 150] as const, smallBurn: 1,
  // The glow behind the world on the outline of what is far to each side: its color, how tight to the outline, and
  // how much of it the moon's own rim takes away.
  glow: color('ember').lerp(color('flame'), 0.25).multiplyScalar(0.14), glowRim: [5, 0.85] as const,
  // The cracks lit from inside on the planet's left side (picture 9's knot of them, at 235 across and 470 down), as a
  // light on what hangs near them: where it is, in the picture's pixels and how far toward the visitor, how bright,
  // over how many units it falls to half, and how far it reaches. It is what lights the left boulder's shoulder.
  cracks: { at: [235, 470, 450] as const, power: 2.5, half: 90, reach: 320 },
  // Further back is darker: between these places toward the visitor, down to this share.
  deep: [-260, 60, 0.3] as const,
  // The stone is laid as if each piece lay at a place of its own deep in the planet, inside this box (its middle and
  // its size, in units), far from the core and the crust, and how much of its relief a piece keeps.
  stoneAt: [0, -180, -250] as const, stoneSpread: [240, 80, 200] as const, relief: 0.5, greatRelief: 1,
  // The small flat breaks a broken face is made of: the larger ones' size in units and how far each is tilted, and
  // the smaller ones'.
  facets: [9, 0.26, 3.2, 0.15] as const,
  // The pits of a broken face: the share of cells that hold one, how dark a pit is, and the cell in units.
  pits: [0.24, 0.25, 1.1] as const,
};
// How each row of the table is laid into the texture: the columns of the file's table.
const COL = COLUMNS.split(' ');
const ROWS = 6;

export const build: PartFactory = async ({ query, renderer }) => {
  const [file, maps] = await Promise.all([load('debris.bin'), stoneMaps(renderer)]);
  const models = [...file.meshes.values()], col = Object.fromEntries(COL.map((c, i) => [c, i])) as Record<string, number>;
  let table = file.meta.pieces as number[][];
  if (query.get('debris') === 'models') {
    // The shared models in a row over the great ones, each shared one stretched to the size of a middling piece.
    const shared = models.filter((m) => m.info.shared).length;
    table = models.map((m, i) => {
      const own = !m.info.shared, k = own ? i - shared : i, row = new Array<number>(COL.length).fill(0);
      const [x, y] = own ? [-300 + 150 * (k % 5), -790 - 120 * Math.floor(k / 5)] : [-340 + (680 / shared) * (k + 0.5), -700];
      Object.assign(row, { [col.model]: i, [col.x]: x, [col.y]: y, [col.z]: 150, [col.qw]: 1, [col.kind]: KIND.scatter, [col.family]: 200 + i, [col.core]: 0.5, [col.ax]: 1 });
      row[col.sx] = row[col.sy] = row[col.sz] = own ? 1 : 14;
      if (own) { const s = 110 / Math.max(m.size, 1); row[col.sx] = row[col.sy] = row[col.sz] = Math.min(1, s); row[col.big] = m.size * 0.5 * row[col.sx]; }
      else row[col.big] = 14;
      return row;
    });
    const one = models.findIndex((m) => m.name === query.get('model'));
    if (one >= 0) table = [table[one]];
  }

  // The table, as a texture: a column for each piece and a row for each thing about it.
  const n = table.length, data = new Float32Array(n * ROWS * 4), put = (row: number, i: number, v: number[]) => data.set(v, (row * n + i) * 4);
  const plates = new Map<number, number[]>();
  for (const p of table) if (p[col.kind] === KIND.plate && !plates.has(p[col.family])) plates.set(p[col.family], [p[col.x], p[col.y], p[col.z]]);
  table.forEach((p, i) => {
    const c = (k: string) => p[col[k]];
    put(0, i, [c('x'), c('y'), c('z'), c('kind')]);
    put(1, i, [c('qx'), c('qy'), c('qz'), c('qw')]);
    put(2, i, [c('sx'), c('sy'), c('sz'), c('family')]);
    put(3, i, [c('ax'), c('ay'), c('az'), c('spin')]);
    put(4, i, [c('phase'), c('extra'), c('look') ?? DRAWN.rock, c('big') ?? 1]);
    put(5, i, [...(plates.get(c('extra')) ?? [c('x'), c('y'), c('z')]), 0]);
  });
  const pieces = new THREE.DataTexture(data, n, ROWS, THREE.RGBAFormat, THREE.FloatType);
  pieces.magFilter = pieces.minFilter = THREE.NearestFilter;
  pieces.needsUpdate = true;

  // Every piece laid into one mesh from its model, each vertex knowing its piece.
  let verts = 0, tris = 0;
  for (const p of table) {
    const g = models[p[col.model]].geometry;
    verts += g.attributes.position.count;
    tris += (g.index?.count ?? 0) / 3;
  }
  const pos = new Float32Array(verts * 3), nor = new Int16Array(verts * 4), light = new Uint8Array(verts * 4), bounce = new Uint8Array(verts * 4), id = new Uint16Array(verts), idx = new Uint32Array(tris * 3);
  let v = 0, t = 0;
  for (let i = 0; i < n; i++) {
    const p = table[i], core = Math.round(p[col.core] * 255), b = [p[col.br], p[col.bg], p[col.bb]].map((x) => Math.round(x * 255)), open = 1 - (p[col.shut] ?? 0);
    const moon = Math.round(255 * MOON_SHARE * (p[col.moon] ?? 1));
    const m = models[p[col.model]], g = m.geometry, k = g.attributes.position.count, q = g.attributes.position.array as Uint16Array;
    const nn = (g.attributes.normal as THREE.InterleavedBufferAttribute).data.array as Int16Array, ll = g.attributes.aLight.array as Uint8Array, bb = g.attributes.aBounce.array as Uint8Array;
    const shared = Boolean(m.info.shared);
    for (let j = 0; j < k; j++) {
      for (let a = 0; a < 3; a++) pos[(v + j) * 3 + a] = m.at.getComponent(a) + (q[j * 3 + a] / 65535) * m.size;
      nor.set(nn.subarray(j * 4, j * 4 + 4), (v + j) * 4);
      light.set(ll.subarray(j * 4, j * 4 + 4), (v + j) * 4);
      bounce.set(bb.subarray(j * 4, j * 4 + 4), (v + j) * 4);
      if (shared) { light[(v + j) * 4] = core; light[(v + j) * 4 + 2] = Math.round(light[(v + j) * 4 + 2] * open); light[(v + j) * 4 + 3] = moon; bounce[(v + j) * 4] = b[0]; bounce[(v + j) * 4 + 1] = b[1]; bounce[(v + j) * 4 + 2] = b[2]; }
      id[v + j] = i;
    }
    const ix = g.index!.array;
    for (let j = 0; j < ix.length; j++) idx[t + j] = ix[j] + v;
    v += k;
    t += ix.length;
    if (i % 150 === 149) await slice();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(nor, 4), 3, 0, true));
  geometry.setAttribute('aLight', new THREE.BufferAttribute(light, 4, true));
  geometry.setAttribute('aBounce', new THREE.BufferAttribute(bounce, 4, true));
  geometry.setAttribute('aPiece', new THREE.BufferAttribute(id, 1));
  geometry.setIndex(new THREE.BufferAttribute(idx, 1));
  // Where the pieces can be, for the stage's reckoning of what is on the screen: they are moved in the shader.
  geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-730, DEBRIS.low, -200), new THREE.Vector3(730, CORE.at[1] - 120, 760));
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
  for (const m of models) m.geometry.dispose();

  // The small streams, as lines in the stage's own measure. The main stream's light is worked out from where the
  // page's stream has run (uStream in ../light.ts).
  const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).multiplyScalar(SCALE);
  const lines = SMALL.map(([px, py, z, long]) => { const [x, y] = fromPicture(px, py, z); return { a: at(x, y, z), b: at(x, y - long, z) }; });
  // While the light is being set: ?debrislight=core,bounce,coreRim,moonRim,stream,fill,small,glow,great,carried,greatMoon,cracks tries other
  // strengths without a change of code.
  const tried = (query.get('debrislight') ?? '').split(',').map(Number), pick = (i: number, usual: number): number => (Number.isFinite(tried[i]) && query.has('debrislight') && tried[i] >= 0 && String(query.get('debrislight')).split(',')[i] !== '' ? tried[i] : usual);
  const uniforms = {
    uPieces: { value: pieces }, uTime: { value: 0 }, uDrift: { value: 1 }, uBounceK: { value: pick(1, LOOK.bounce) }, uCoreK: { value: pick(0, LOOK.core) }, uDebrisCore: { value: new THREE.Vector3(...CORE.at) },
    uCoreSteep: { value: new THREE.Vector2(...LOOK.steep) }, uCoreSteepF: { value: new THREE.Vector2(LOOK.steep[0] * SCALE, LOOK.steep[1]) },
    uStone: { value: stone() }, uChip: { value: LOOK.chip },
    uGlow: { value: LOOK.glow.clone().multiplyScalar(pick(7, 1)) }, uGlowRim: { value: new THREE.Vector2(...LOOK.glowRim) },
    uSmallDepth: { value: new THREE.Vector2(...LOOK.smallDepth) }, uSmallBurn: { value: LOOK.smallBurn }, uSkinPale: { value: LOOK.skin.pale }, uSkinDark: { value: LOOK.skin.dark },
    uWorn: { value: LOOK.worn }, uFill: { value: new THREE.Vector4(LOOK.fill.color.r, LOOK.fill.color.g, LOOK.fill.color.b, LOOK.fill.least).multiplyScalar(pick(5, 1)).setW(LOOK.fill.least) }, uFillDir: { value: new THREE.Vector3(...LOOK.fill.from).normalize() },
    uNight: { value: LOOK.night }, uRockMirror: { value: LOOK.mirror },
    uMoonBody: { value: LOOK.moonBody }, uMoonRim: { value: new THREE.Vector4(pick(3, LOOK.moonRim[0]), LOOK.moonRim[1], LOOK.moonRim[2], LOOK.moonRim[3]) }, uMoonRimColor: { value: LOOK.rimColor }, uMoonWay: { value: new THREE.Vector3(...MOONWARD).normalize() },
    uCoreRim: { value: new THREE.Vector4(pick(2, LOOK.coreRim[0]), LOOK.coreRim[1], LOOK.coreRim[2], 0) }, uBoulder: { value: new THREE.Vector4(...LOOK.boulder) }, uGreatEdge: { value: new THREE.Vector2(...LOOK.greatEdge) }, uCrest: { value: new THREE.Vector2(...LOOK.crest) }, uGreatTone: { value: new THREE.Vector4(...LOOK.greatTone) }, uGreatFill: { value: new THREE.Vector2(...LOOK.greatFill) },
    uGreat: { value: new THREE.Vector4(pick(8, LOOK.great[0]), LOOK.great[1] * SCALE, LOOK.great[2], 0) }, uBeds: { value: new THREE.Vector4(...LOOK.beds) }, uBedEase: { value: LOOK.bedEase }, uKnap: { value: new THREE.Vector4(...LOOK.knap) }, uCrumb: { value: new THREE.Vector4(...LOOK.crumb) }, uGreatMoon: { value: new THREE.Vector3(pick(10, LOOK.greatMoon[0]), LOOK.greatMoon[1], LOOK.greatMoon[2]) }, uGrade: { value: new THREE.Vector3(...LOOK.grade) },
    uStreamLight: { value: new THREE.Vector4(pick(4, LOOK.stream.main[0]), ...LOOK.stream.main.slice(1), 0) }, uStreamColor: { value: LOOK.stream.color }, uCarried: { value: new THREE.Vector3(pick(9, LOOK.carried[0]), LOOK.carried[1], LOOK.carried[2]) },
    uDeep: { value: new THREE.Vector3(...LOOK.deep) }, uStudio: { value: query.get('debris') === 'models' ? 1 : 0 }, uShow: { value: Number(query.get('debrisshow') ?? 0) || 0 },
    uStoneAt: { value: new THREE.Vector3(...LOOK.stoneAt) }, uStoneSpread: { value: new THREE.Vector3(...LOOK.stoneSpread) }, uStoneRelief: { value: LOOK.relief }, uGreatRelief: { value: LOOK.greatRelief }, uFacet: { value: new THREE.Vector4(...LOOK.facets) }, uPits: { value: new THREE.Vector3(...LOOK.pits) },
    uCracks: { value: at(...fromPicture(LOOK.cracks.at[0], LOOK.cracks.at[1], LOOK.cracks.at[2])) }, uCracksI: { value: new THREE.Vector3(pick(11, LOOK.cracks.power), LOOK.cracks.half, LOOK.cracks.reach) },
    uLineA: { value: lines.map((l) => l.a) }, uLineB: { value: lines.map((l) => l.b) }, uLineI: { value: lines.map(() => new THREE.Vector2(pick(6, LOOK.stream.small[0]), LOOK.stream.small[1])) },
  };
  // Every piece is drawn twice: first its depth alone, then its stone where that depth is, so the stone is worked out
  // once for each pixel and never for a face that a nearer one then covers. Drawn in one pass, a piece's far faces and
  // the pieces behind it were worked out in full, wherever they came first in the table: a fifth of the part's time
  // by the core. Both passes place every vertex by the same lines, and the depth is laid a hair deeper, so the stone
  // always finds it. Not by declaring gl_Position invariant: with it the stone came out darker and softer on every
  // piece. ?early=0 draws it in one pass.
  const early = query.get('early') !== '0';
  const make = (depth: boolean): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: STONE.rough[0], metalness: 0, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\n${STONE_VERT_PARS}\n${S.VERT_PARS}`)
        .replace('#include <beginnormal_vertex>', `${S.VERT_MOTION}\nvec3 objectNormal = dNor;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${S.VERT_LIGHT}`);
      // What is laid after a chunk here runs after the stone's own, which is laid after it next.
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\n${S.FRAG_PARS}`)
        .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${S.MOON_PARS}`)
        .replace('#include <color_fragment>', `#include <color_fragment>\n${S.COLOR}`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${S.NORMAL}`)
        .replace('#include <lights_fragment_begin>', `${S.MOON_SWAP}\n#include <lights_fragment_begin>\n${S.LIGHT}`)
        .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>\n${S.NIGHT}`)
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${S.DEEP}`);
      stoneShader(sh, maps, true, true);
      // The stream's light on what broke away is the part's own.
      (sh.uniforms.uStoneStreamPower as { value: number }).value = 0;
      if (depth) sh.fragmentShader = sh.fragmentShader.replace(/void main\(\) \{[\s\S]*$/, 'void main() { gl_FragColor = vec4( 0.0 ); }');
    };
    return lit(m, { key: depth ? 'debris-depth' : 'debris', baked: true });
  };
  const material = make(false), deep = early ? make(true) : null;
  if (deep) {
    deep.colorWrite = false;
    deep.polygonOffset = true;
    deep.polygonOffsetFactor = 1;
    deep.polygonOffsetUnits = 4;
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  const group = new THREE.Group();
  group.add(mesh);
  if (deep) {
    const first = new THREE.Mesh(geometry, deep);
    first.castShadow = false;
    first.receiveShadow = mesh.receiveShadow;
    first.frustumCulled = false;
    first.matrixAutoUpdate = false;
    first.renderOrder = mesh.renderOrder - 1;
    group.add(first);
  }
  return {
    group,
    alone: query.get('debris') === 'models' ? (table.length === 1 ? { at: [table[0][col.x], table[0][col.y], 150], r: Math.max(8, table[0][col.big] * 1.1) } : { at: [0, -860, 150], r: 380 }) : { at: [0, -800, 200], r: 720 },
    update(s) { uniforms.uTime.value = s.t; return !s.still; },
    // For the script that takes the world as pictures (scripts/world/picture.mjs): every piece's row of the table,
    // only some of the pieces drawn, and every piece held where it rests.
    tools: {
      pieces: () => table.map((p) => ({ kind: p[col.kind], family: p[col.family], at: [p[col.x], p[col.y], p[col.z]], big: p[col.big] ?? 1, size: [p[col.sx], p[col.sy], p[col.sz]], extra: p[col.extra], model: p[col.model] })),
      show(ids: readonly number[] | null) {
        const on = ids && new Set(ids);
        table.forEach((p, i) => { const k = !on || on.has(i) ? 1 : 0; data.set([p[col.sx] * k, p[col.sy] * k, p[col.sz] * k], (2 * n + i) * 4); });
        pieces.needsUpdate = true;
      },
      rest(on: boolean) { uniforms.uDrift.value = on ? 0 : 1; },
    },
    dispose() { geometry.dispose(); material.dispose(); deep?.dispose(); pieces.dispose(); maps.release(); },
  };
};
