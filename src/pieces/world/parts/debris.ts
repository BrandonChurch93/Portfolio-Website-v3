import * as THREE from 'three';
import { slice } from '../../../world/build';
import { CORE, DEBRIS, SCALE, SMALL, SOURCE, fromPicture } from '../layout';
import { color, lit } from '../light';
import { load } from '../files';
import type { PartFactory } from '../part';
import { KIND } from './debris/motion';
import * as S from './debris/shaders';

// What broke away: the pieces of the planet that hang under it, caught in its gravity, as one scene. The field is
// the original plan's (scripts/world/debris-plan.json), made by scripts/world/parts/debris/make.mjs into
// public/world/debris.bin: some twenty-nine rock models, and a table of every piece, which model it wears, where it
// rests, how it is turned and how it moves (./debris/motion.ts). Here every piece is laid into one mesh, each vertex
// knowing its piece, and the table goes to the graphics card as a texture that is written once. The vertex shader
// moves every piece from the clock alone, so nothing is written after the part is made, and Safari keeps nothing.
// ?debris=models lays each model out once in a row, to be looked at alone, and &model=G9 shows that one alone.

const LOOK = {
  // The rock's own color, its rusty beds, and the planet's outer surface where a piece shows it: pale on the side
  // the moon lights, dark on the other.
  rock: color('bg-3').lerp(color('text-3'), 0.3),
  rust: color('bronze-deep').lerp(color('bronze'), 0.25),
  skin: { pale: color('text-3').lerp(color('text-2'), 0.35), dark: color('bg-3').lerp(color('text-3'), 0.2) },
  rough: 0.86,
  // The detail map: how many units each of its two sizes covers, how much an edge is worn bright, and how deep its
  // breaks are, in the stage's own measure.
  detail: [38, 11, 0.38, 1.0 * SCALE] as const,
  // The stream's light: its color, and for the stream and the small streams, how bright and over how many units it
  // falls to half.
  stream: { color: color('hot').lerp(color('flame'), 0.3), main: [26, 120] as const, small: [4, 45] as const, foot: 420 },
};
// How each row of the table is laid into the texture: the columns of the file's table.
const COLUMNS = 'model x y z qx qy qz qw sx sy sz kind family phase ax ay az spin core br bg bb extra'.split(' ');
const ROWS = 6;

export const build: PartFactory = async ({ query }) => {
  const [file, detail] = await Promise.all([load('debris.bin'), new THREE.TextureLoader().loadAsync('/world/debris-detail.png')]);
  const models = [...file.meshes.values()], col = Object.fromEntries(COLUMNS.map((c, i) => [c, i])) as Record<string, number>;
  let table = file.meta.pieces as number[][];
  if (query.get('debris') === 'models') {
    // The shared models in a row over the great ones, each shared one stretched to the size of a middling piece.
    const shared = models.filter((m) => m.info.shared).length;
    table = models.map((m, i) => {
      const own = !m.info.shared, k = own ? i - shared : i, row = new Array<number>(COLUMNS.length).fill(0);
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
    put(4, i, [c('phase'), c('extra'), 0, 0]);
    put(5, i, [...(plates.get(c('extra')) ?? [c('x'), c('y'), c('z')]), 0]);
  });
  const pieces = new THREE.DataTexture(data, n, ROWS, THREE.RGBAFormat, THREE.FloatType);
  pieces.magFilter = pieces.minFilter = THREE.NearestFilter;
  pieces.needsUpdate = true;
  detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
  detail.colorSpace = THREE.NoColorSpace;
  detail.anisotropy = 4;

  // Every piece laid into one mesh from its model, each vertex knowing its piece.
  let verts = 0, tris = 0;
  for (const p of table) { const g = models[p[col.model]].geometry; verts += g.attributes.position.count; tris += (g.index?.count ?? 0) / 3; }
  const pos = new Float32Array(verts * 3), nor = new Int16Array(verts * 4), light = new Uint8Array(verts * 4), bounce = new Uint8Array(verts * 4), id = new Uint16Array(verts), idx = new Uint32Array(tris * 3);
  let v = 0, t = 0;
  for (let i = 0; i < n; i++) {
    const p = table[i], m = models[p[col.model]], g = m.geometry, k = g.attributes.position.count, q = g.attributes.position.array as Uint16Array;
    const nn = (g.attributes.normal as THREE.InterleavedBufferAttribute).data.array as Int16Array, ll = g.attributes.aLight.array as Uint8Array, bb = g.attributes.aBounce.array as Uint8Array;
    const shared = Boolean(m.info.shared), core = Math.round(p[col.core] * 255), b = [p[col.br], p[col.bg], p[col.bb]].map((x) => Math.round(x * 255));
    for (let j = 0; j < k; j++) {
      for (let a = 0; a < 3; a++) pos[(v + j) * 3 + a] = m.at.getComponent(a) + (q[j * 3 + a] / 65535) * m.size;
      nor.set(nn.subarray(j * 4, j * 4 + 4), (v + j) * 4);
      light.set(ll.subarray(j * 4, j * 4 + 4), (v + j) * 4);
      bounce.set(bb.subarray(j * 4, j * 4 + 4), (v + j) * 4);
      if (shared) { light[(v + j) * 4] = core; bounce[(v + j) * 4] = b[0]; bounce[(v + j) * 4 + 1] = b[1]; bounce[(v + j) * 4 + 2] = b[2]; }
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

  // The stream and the small streams, as lines in the stage's own measure.
  const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).multiplyScalar(SCALE);
  const lines = [{ a: at(...SOURCE), b: at(SOURCE[0], DEBRIS.low - LOOK.stream.foot, SOURCE[2]), i: LOOK.stream.main }, ...SMALL.map(([px, py, z, long]) => { const [x, y] = fromPicture(px, py, z); return { a: at(x, y, z), b: at(x, y - long, z), i: LOOK.stream.small }; })];
  const uniforms = {
    uPieces: { value: pieces }, uTime: { value: 0 }, uCoreAt: { value: new THREE.Vector3(...CORE.at) }, uDetail: { value: detail },
    uRock: { value: LOOK.rock }, uRust: { value: LOOK.rust }, uSkinPale: { value: LOOK.skin.pale }, uSkinDark: { value: LOOK.skin.dark },
    uLook: { value: new THREE.Vector4(...LOOK.detail) },
    uStreamA: { value: lines.map((l) => l.a) }, uStreamB: { value: lines.map((l) => l.b) }, uStreamI: { value: lines.map((l) => new THREE.Vector2(l.i[0], l.i[1] * SCALE)) },
    uStreamColor: { value: LOOK.stream.color },
  };
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: LOOK.rough, metalness: 0 });
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${S.VERT_PARS}`)
      .replace('#include <beginnormal_vertex>', `${S.VERT_MOTION}\nvec3 objectNormal = dNor;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = dPos;\nvWorldP = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${S.FRAG_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${S.COLOR}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${S.NORMAL}`)
      .replace('#include <lights_fragment_begin>', `#include <lights_fragment_begin>\n${S.STREAM}`);
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
    dispose() { geometry.dispose(); material.dispose(); pieces.dispose(); detail.dispose(); },
  };
};
