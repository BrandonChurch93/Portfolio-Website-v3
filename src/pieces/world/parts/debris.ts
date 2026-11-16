import * as THREE from 'three';
import { slice } from '../../../world/build';
import { CORE, DEBRIS, LIGHT, SCALE, SMALL, fromPicture } from '../layout';
import { STONE, stoneMaps } from './rock/stone';
import { color, lit, stone } from '../light';
import { load } from '../files';
import type { PartFactory } from '../part';
import { STREAM } from '../../../stream/config';
import { FACET_KINDS, VERTEX_FLOATS, buildShards, facetKind } from '../../../stream/shards';
import { KIND } from './debris/motion';
import { COLUMNS, LOOK as DRAWN, MOON_SHARE } from './debris/table';
import * as S from './debris/shaders';

// What broke away: the pieces of the planet that hang under it, caught in its gravity, as one scene. The field is
// the original plan's (scripts/world/debris-plan.json), made by scripts/world/parts/debris/make.mjs into
// public/world/debris.bin: some twenty-nine rock models, and a table of every piece, which model it wears, where it
// rests, how it is turned and how it moves (./debris/motion.ts). Here every piece is laid into one mesh, each vertex
// knowing its piece, and the table goes to the graphics card as a texture that is written once. The vertex shader
// moves every piece from the clock alone, so nothing is written after the part is made, and Safari keeps nothing.
// Every piece is the planet's stone, with the hollow's own grain and without its pockets and grooves, but a chip the
// stream carries, which is one of the stream's own shards (src/stream/shards.ts). Near the stream the small stones
// are its shapes too.
// ?debris=models lays each model out once in a row, to be looked at alone, and &model=G9 shows that one alone.

const LOOK = {
  // The planet's stone (stone()) is what every piece is. An old face carries a weathered skin, greyer and darker, as
  // much as this share of it, and less where the core burns close (from the first distance to the second, in units,
  // down to the second share); a flake's scar is fresh stone, the stone's own chip.
  patina: stone().lerp(color('text-3', 0.5), 0.75).multiplyScalar(0.55),
  weather: [0.85, 0.3, 230, 520] as const,
  chip: STONE.chip,
  // The stone's grain map, laid at a piece's own scale: a tile is this share of its size, between these many units,
  // and how much it moves the tone.
  grain: [0.9, 6, 48, 0.32] as const,
  // The planet's outer surface where a piece shows it: pale on the side the moon lights, dark on the other.
  skin: { pale: color('text-3').lerp(color('text-2'), 0.35).multiplyScalar(0.5), dark: color('bg-3').lerp(color('text-3'), 0.2) },
  rough: 0.86,
  // A carried shard's metal: the stream's own shards are dark copper.
  shard: color('copper').lerp(color('bronze-deep'), 0.35),
  // How much of the light the rock bounces reaches a piece, and of the core's light on its faces, and past what
  // distance, in units, that falls away as a further power.
  bounce: 0.1,
  core: 0.22,
  steep: [360, 2.2] as const,
  // The core's burning edge: how bright, how tight to the outline, how much a broken edge turned to it catches.
  coreRim: [1.6, 5, 1] as const,
  // The moon: how much of its light a face turned to it keeps (it is behind the pieces), and the rim it draws: how
  // bright, how tight to the outline, and how much of the stone's color it takes (none is the moon's own pale).
  moonBody: 0.03,
  moonRim: [3, 12, 0.6] as const,
  rimTint: color('pale').lerp(color('hot'), 0.25),
  // The night's soft light on a body, from the visitor's side and above (in the camera's frame): its color and
  // strength, how much reaches a face turned from it, and where it comes from. It gives a body its form.
  fill: { color: color('pale').lerp(color('text-2'), 0.5).multiplyScalar(0.26), least: 0.12, from: [-0.35, 0.55, 0.75] as const },
  // The night's light on a piece, turned against the world's warm tint on rock (LIGHT.warm) to a warm neutral, and how
  // much of the night the rock mirrors.
  night: new THREE.Color(1 / LIGHT.warm[0], 1 / LIGHT.warm[1], 1 / LIGHT.warm[2]).multiply(color('pale')).multiplyScalar(0.2),
  mirror: 0.08,
  // How much paler an edge is where it is fresh.
  worn: 0.6,
  // The hackle lines on a face: how many run round the struck place, and how deep they are, as a share of the size.
  relief: [0, 46, 0.008, 0] as const,
  // The stream's light: its color, how bright where it is full, over how many units it falls to half, how far it
  // reaches at all, and how much it wraps round a face. The small streams: how bright, and over how many units.
  stream: { color: color('hot').lerp(color('flame'), 0.35), main: [9, 45, 260, 0.05] as const, small: [5, 26] as const },
  // The small streams are drawn over the world, so each lights what is drawn beside it: within this depth of its own,
  // as far as this many units from it, and an edge that stands out burns this much more.
  smallDepth: [340, 150] as const, smallBurn: 2.5,
  // A carried shard mirrors this much of the night: less, so a face turned from every light is dark.
  shardMirror: 0.3,
  // The glow behind the world on the outline of what the moon does not reach: its color, how tight to the outline,
  // and how much of it the moon's own rim takes away.
  glow: color('ember').lerp(color('flame'), 0.25).multiplyScalar(0.55), glowRim: [4, 0.8] as const,
  // The cracks lit from inside on the planet's left side (picture 9's knot of them, at 235 across and 470 down), as a
  // light on what hangs near them: where it is, in the picture's pixels and how far toward the visitor, how bright,
  // over how many units it falls to half, and how far it reaches. It is what lights the left boulder's shoulder.
  cracks: { at: [235, 470, 450] as const, power: 10, half: 120, reach: 420 },
  // Further back is darker: between these places toward the visitor, down to this share.
  deep: [-260, 60, 0.3] as const,
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
      if (own) { const s = 110 / Math.max(m.size, 1); row[col.sx] = row[col.sy] = row[col.sz] = Math.min(1, s); }
      return row;
    });
    const one = models.findIndex((m) => m.name === query.get('model'));
    if (one >= 0) table = [table[one]];
  }

  // The table, as a texture: a column for each piece and a row for each thing about it.
  const n = table.length, data = new Float32Array(n * ROWS * 4), put = (row: number, i: number, v: number[]) => data.set(v, (row * n + i) * 4);
  const plates = new Map<number, number[]>();
  for (const p of table) if (p[col.kind] === KIND.plate) plates.set(p[col.family], [p[col.x], p[col.y], p[col.z]]);
  table.forEach((p, i) => {
    const c = (k: string) => p[col[k]];
    put(0, i, [c('x'), c('y'), c('z'), c('kind')]);
    put(1, i, [c('qx'), c('qy'), c('qz'), c('qw')]);
    put(2, i, [c('sx'), c('sy'), c('sz'), c('family')]);
    put(3, i, [c('ax'), c('ay'), c('az'), c('spin')]);
    put(4, i, [c('phase'), c('extra'), c('look') ?? DRAWN.rock, 0]);
    put(5, i, [...(plates.get(c('extra')) ?? [c('x'), c('y'), c('z')]), 0]);
  });
  const pieces = new THREE.DataTexture(data, n, ROWS, THREE.RGBAFormat, THREE.FloatType);
  pieces.magFilter = pieces.minFilter = THREE.NearestFilter;
  pieces.needsUpdate = true;

  // Every piece laid into one mesh from its model, each vertex knowing its piece. A chip the stream carries wears one
  // of the stream's own shards, so nobody can say where what broke away ends and the stream's shards begin.
  const shards = buildShards(STREAM.seed), [least, most] = STREAM.sizes.facets.map((v) => v * STREAM.scale);
  const faceted = (p: number[]) => (p[col.look] ?? (p[col.kind] === KIND.fall ? DRAWN.shard : DRAWN.rock)) !== DRAWN.rock;
  const facetOf = (i: number, p: number[]) => shards.kinds[facetKind(Math.min(1, Math.max(0, (p[col.sx] - least) / (most - least))), ((i * 0.618034) % 1 + 1) % 1) % FACET_KINDS];
  let verts = 0, tris = 0;
  table.forEach((p, i) => {
    if (faceted(p)) { const f = facetOf(i, p); verts += f.count; tris += f.count / 3; return; }
    const g = models[p[col.model]].geometry;
    verts += g.attributes.position.count;
    tris += (g.index?.count ?? 0) / 3;
  });
  const pos = new Float32Array(verts * 3), nor = new Int16Array(verts * 4), light = new Uint8Array(verts * 4), bounce = new Uint8Array(verts * 4), id = new Uint16Array(verts), idx = new Uint32Array(tris * 3);
  let v = 0, t = 0;
  for (let i = 0; i < n; i++) {
    const p = table[i], core = Math.round(p[col.core] * 255), b = [p[col.br], p[col.bg], p[col.bb]].map((x) => Math.round(x * 255)), open = 1 - (p[col.shut] ?? 0);
    const moon = Math.round(255 * MOON_SHARE * (p[col.moon] ?? 1));
    if (faceted(p)) {
      const f = facetOf(i, p);
      for (let j = 0; j < f.count; j++) {
        const o = (f.first + j) * VERTEX_FLOATS;
        for (let a = 0; a < 3; a++) { pos[(v + j) * 3 + a] = shards.data[o + a]; nor[(v + j) * 4 + a] = Math.round(shards.data[o + 3 + a] * 32767); }
        light.set([core, 128, Math.round(255 * open), moon], (v + j) * 4);
        bounce.set([b[0], b[1], b[2], 0], (v + j) * 4);
        id[v + j] = i;
        idx[t + j] = v + j;
      }
      v += f.count;
      t += f.count;
      continue;
    }
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
  // While the light is being set: ?debrislight=core,bounce,coreRim,moonRim,stream,night tries other strengths without
  // a change of code.
  const tried = (query.get('debrislight') ?? '').split(',').map(Number), pick = (i: number, usual: number): number => (Number.isFinite(tried[i]) && query.has('debrislight') && tried[i] >= 0 && String(query.get('debrislight')).split(',')[i] !== '' ? tried[i] : usual);
  const uniforms = {
    uPieces: { value: pieces }, uTime: { value: 0 }, uBounceK: { value: pick(1, LOOK.bounce) }, uCoreK: { value: pick(0, LOOK.core) }, uDebrisCore: { value: new THREE.Vector3(...CORE.at) },
    uCoreSteep: { value: new THREE.Vector2(...LOOK.steep) }, uCoreSteepF: { value: new THREE.Vector2(LOOK.steep[0] * SCALE, LOOK.steep[1]) },
    uStone: { value: stone() }, uPatina: { value: LOOK.patina }, uChip: { value: LOOK.chip }, uWeather: { value: new THREE.Vector4(...LOOK.weather) },
    uStoneGrain: { value: maps.grain }, uGrainK: { value: new THREE.Vector4(...LOOK.grain) }, uGlow: { value: LOOK.glow }, uGlowRim: { value: new THREE.Vector2(...LOOK.glowRim) },
    uSmallDepth: { value: new THREE.Vector2(...LOOK.smallDepth) }, uSmallBurn: { value: LOOK.smallBurn }, uShardMirror: { value: LOOK.shardMirror }, uSkinPale: { value: LOOK.skin.pale }, uSkinDark: { value: LOOK.skin.dark }, uShard: { value: LOOK.shard },
    uWorn: { value: LOOK.worn }, uFill: { value: new THREE.Vector4(LOOK.fill.color.r, LOOK.fill.color.g, LOOK.fill.color.b, LOOK.fill.least).multiplyScalar(pick(5, 1)).setW(LOOK.fill.least) }, uFillDir: { value: new THREE.Vector3(...LOOK.fill.from).normalize() }, uRimTint: { value: LOOK.rimTint }, uNight: { value: LOOK.night }, uRockMirror: { value: LOOK.mirror },
    uMoonBody: { value: LOOK.moonBody }, uMoonRim: { value: new THREE.Vector3(pick(3, LOOK.moonRim[0]), LOOK.moonRim[1], LOOK.moonRim[2]) },
    uCoreRim: { value: new THREE.Vector4(pick(2, LOOK.coreRim[0]), LOOK.coreRim[1], LOOK.coreRim[2], 0) },
    uStreamLight: { value: new THREE.Vector4(pick(4, LOOK.stream.main[0]), ...LOOK.stream.main.slice(1)) }, uStreamColor: { value: LOOK.stream.color },
    uRelief: { value: new THREE.Vector4(...LOOK.relief).multiplyScalar(query.has('relief') ? Number(query.get('relief')) : 1).setY(LOOK.relief[1]) }, uDeep: { value: new THREE.Vector3(...LOOK.deep) },
    uCracks: { value: at(...fromPicture(LOOK.cracks.at[0], LOOK.cracks.at[1], LOOK.cracks.at[2])) }, uCracksI: { value: new THREE.Vector3(LOOK.cracks.power, LOOK.cracks.half, LOOK.cracks.reach) },
    uLineA: { value: lines.map((l) => l.a) }, uLineB: { value: lines.map((l) => l.b) }, uLineI: { value: lines.map(() => new THREE.Vector2(LOOK.stream.small[0], LOOK.stream.small[1])) },
  };
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: LOOK.rough, metalness: 0 });
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${S.VERT_PARS}`)
      .replace('#include <beginnormal_vertex>', `${S.VERT_MOTION}\nvec3 objectNormal = dNor;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${S.VERT_LIGHT}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${S.FRAG_PARS}`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${S.MOON_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${S.COLOR}`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${S.FINISH}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${S.NORMAL}`)
      .replace('#include <lights_fragment_begin>', `${S.MOON_SWAP}\n#include <lights_fragment_begin>\n${S.LIGHT}`)
      .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>\n${S.NIGHT}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${S.DEEP}`);
  };
  lit(material, { key: 'debris', baked: true });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  const group = new THREE.Group();
  group.add(mesh);
  return {
    group,
    alone: query.get('debris') === 'models' ? (table.length === 1 ? { at: [table[0][col.x], table[0][col.y], 150], r: 75 } : { at: [0, -860, 150], r: 380 }) : { at: [0, -800, 200], r: 720 },
    update(s) { uniforms.uTime.value = s.t; return !s.still; },
    dispose() { geometry.dispose(); material.dispose(); pieces.dispose(); maps.release(); },
  };
};
