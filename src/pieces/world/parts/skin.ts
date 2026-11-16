import * as THREE from 'three';
import { hex, type PaletteName } from '../../../config/palette';
import { load, mesh } from '../files';
import { lit, stone as planetStone } from '../light';
import type { PartFactory } from '../part';
import { CRACK_CELL, DARK_LIGHT, GLOW, KNOT_POOL, STONE, UNDER } from './skin/look';
import * as S from './skin/shaders';

// The skin: what survives of the planet's own outer surface at each side of the tear. At the visitor's left, turned
// from the moon, a deep warm near black cut by cracks with the core's light deep in them; at the right, under the
// moon, the pale stone with its craters. Its mesh and its map are made ahead by scripts/world/parts/skin/make.mjs
// (public/world/skin.bin and skin-map.bin): the craters, the wide part of the cracks and the broken crust at the torn
// edges are geometry, and the map, laid over picture 9's own pixels, holds the relief finer than that, the stone's
// color and the cracks' light. ?skinat=x,y,z,r frames the skin alone on any place of it. While its light is being
// set, ?skinpale=k,power tries another pale stone, ?skinrock= another strength for the cracks' light on the rock,
// ?skinknot=power,reach,hot,hotR another light round the knot and ?skindark=fill,rim,slab another night on the dark side.

type Shader = THREE.WebGLProgramParametersWithUniforms;
const after = (src: string, chunk: string, add: string): string => {
  if (!src.includes(`#include <${chunk}>`)) throw new Error(`skin: the standard shader has no ${chunk}`);
  return src.replace(`#include <${chunk}>`, `#include <${chunk}>\n${add}`);
};
const linear = (name: PaletteName): THREE.Color => new THREE.Color(hex(name));
const stone = (s: { from: PaletteName; to: PaletteName; k: number; power: number }): THREE.Color => linear(s.from).lerp(linear(s.to), s.k).multiplyScalar(s.power);
const tried = (q: URLSearchParams, name: string): number[] | null => { const v = q.get(name)?.split(',').map(Number); return v && v.every(Number.isFinite) ? v : null; };
// Seen alone, this place of it fills the frame.
const ALONE = { at: [0, -260, 0] as [number, number, number], r: 700 };

async function readMap(file: string): Promise<THREE.DataTexture> {
  const res = await fetch(`/world/${file}`);
  if (!res.ok) throw new Error(`The skin's map ${file} is missing (${res.status}). Make it with: node scripts/world/parts/skin/make.mjs`);
  const buf = await res.arrayBuffer(), head = new DataView(buf);
  if (head.getUint32(0, true) !== 0x4d4e4b53) throw new Error(`${file} is not the skin's map`);
  const wide = head.getUint32(4, true), tall = head.getUint32(8, true), split = head.getUint32(12, true);
  const data = new Uint8Array(await new Response(new Blob([buf.slice(16)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  const t = new THREE.DataTexture(data, wide, tall, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.flipY = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.userData.split = split;
  t.needsUpdate = true;
  return t;
}

// The cracks as the shader cuts them (scripts/world/parts/skin/features.mjs, crackLines): short straight lengths in
// picture 9's pixels, eight numbers each (the two ends, the half width and the heat at each). The shader asks each
// pixel only about the lengths near it: a grid over the dark side holds, for each cell, the nearest CRACK_CELL.most.
function crackTextures(lines: number[]): { seg: THREE.DataTexture; cell: THREE.DataTexture; grid: THREE.Vector4; size: THREE.Vector2 } {
  const n = lines.length / 8, seg = new Float32Array(n * 8);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const reach = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [ax, ay, bx, by, wa, wb, ha, hb] = lines.slice(i * 8, i * 8 + 8);
    seg.set([ax, ay, bx, by], i * 4);
    seg.set([wa, wb, ha, hb], (n + i) * 4);
    reach[i] = CRACK_CELL.reach(Math.max(wa, wb), Math.max(ha, hb));
    x0 = Math.min(x0, ax - reach[i], bx - reach[i]); y0 = Math.min(y0, ay - reach[i], by - reach[i]);
    x1 = Math.max(x1, ax + reach[i], bx + reach[i]); y1 = Math.max(y1, ay + reach[i], by + reach[i]);
  }
  const C = CRACK_CELL.size, nx = Math.ceil((x1 - x0) / C), ny = Math.ceil((y1 - y0) / C), K = CRACK_CELL.most;
  const cells = new Float32Array(nx * ny * K).fill(-1);
  const near: { i: number; d: number }[] = [];
  for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) {
    near.length = 0;
    const px = x0 + (cx + 0.5) * C, py = y0 + (cy + 0.5) * C, half = C * Math.SQRT1_2;
    for (let i = 0; i < n; i++) {
      const ax = seg[i * 4], ay = seg[i * 4 + 1], dx = seg[i * 4 + 2] - ax, dy = seg[i * 4 + 3] - ay;
      const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / Math.max(1e-9, dx * dx + dy * dy)));
      const d = Math.hypot(px - ax - dx * t, py - ay - dy * t);
      if (d - half < reach[i]) near.push({ i, d: d - Math.max(seg[(n + i) * 4], seg[(n + i) * 4 + 1]) * 2 });
    }
    near.sort((a, b) => a.d - b.d);
    for (let k = 0; k < Math.min(K, near.length); k++) cells[((cy * nx + cx) * K) + k] = near[k].i;
  }
  const tex = (data: Float32Array, w: number, h: number): THREE.DataTexture => {
    const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  };
  return { seg: tex(seg, n, 2), cell: tex(cells, nx * (K / 4), ny), grid: new THREE.Vector4(x0, y0, C, nx), size: new THREE.Vector2(nx, ny) };
}

export const build: PartFactory = async ({ query, renderer }) => {
  const [file, map] = await Promise.all([load('skin.bin'), readMap('skin-map.bin')]);
  const skin = file.meshes.get('skin');
  if (!skin) throw new Error('skin.bin holds no skin: make it again with scripts/world/parts/skin/make.mjs');
  map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0 });
  // Where the mesh's own cube is, so the shader knows each place in the world's units.
  const place = new THREE.Vector4();
  const pale = tried(query, 'skinpale'), rock = tried(query, 'skinrock'), knot = tried(query, 'skinknot'), dark = tried(query, 'skindark');
  const info = skin.info as { map: number[]; dark: [number, number]; knot: number[]; torn: number[]; cracks: number[] };
  if (!info.knot || !info.torn || info.torn.length !== 67 || !info.cracks) throw new Error('skin.bin is older than its shader: make it again with scripts/world/parts/skin/make.mjs');
  const ck = crackTextures(info.cracks);
  const K = [KNOT_POOL.power, KNOT_POOL.reach, KNOT_POOL.hot, KNOT_POOL.hotR].map((v, i) => knot?.[i] ?? v);
  m.onBeforeCompile = (sh: Shader) => {
    Object.assign(sh.uniforms, {
      uSkinMap: { value: map },
      uSkinMapSize: { value: new THREE.Vector4(map.image.width, map.image.height, map.userData.split as number, info.map[3]) },
      uPale: { value: stone(pale ? { ...STONE.pale, k: pale[0], power: pale[1] ?? STONE.pale.power } : STONE.pale) }, uDust: { value: stone(STONE.dust) }, uDark: { value: stone(STONE.dark) },
      uUnder: { value: planetStone().multiplyScalar(UNDER) }, uStone: { value: planetStone() }, uSkinPlace: { value: place }, uGlowRock: { value: rock ? rock[0] : GLOW.rock },
      uKnotA: { value: new THREE.Vector3(...info.knot.slice(0, 3)) }, uKnotB: { value: new THREE.Vector3(...info.knot.slice(3, 6)) }, uKnot: { value: new THREE.Vector4(...K) },
      uDarkLight: { value: new THREE.Vector3(dark?.[0] ?? DARK_LIGHT.fill, dark?.[1] ?? DARK_LIGHT.rim, dark?.[2] ?? DARK_LIGHT.slab) }, uDarkFrom: { value: new THREE.Vector3(...DARK_LIGHT.from) },
      uDarkAt: { value: new THREE.Vector2(...info.dark) }, uTorn: { value: info.torn },
      uCkSeg: { value: ck.seg }, uCkCell: { value: ck.cell }, uCkGrid: { value: ck.grid }, uCkSize: { value: ck.size },
      uGlowPale: { value: linear(GLOW.ramp[0]) }, uGlowHot: { value: linear(GLOW.ramp[1]) }, uGlowFlame: { value: linear(GLOW.ramp[2]) }, uGlowEmber: { value: linear(GLOW.ramp[3]) },
    });
    sh.vertexShader = after(after(sh.vertexShader, 'common', S.VERT_PARS), 'begin_vertex', S.VERT);
    let fr = after(sh.fragmentShader, 'common', S.FRAG_PARS);
    fr = after(fr, 'color_fragment', S.COLOR);
    fr = after(fr, 'normal_fragment_maps', S.NORMAL);
    fr = after(fr, 'emissivemap_fragment', S.EMIT);
    fr = after(fr, 'lights_fragment_end', S.NIGHT);
    // ?skindebug=<a color in GLSL> draws that in place of the skin, for finding what a fault comes from.
    const debug = query.get('skindebug');
    if (debug) fr = after(fr, 'opaque_fragment', `gl_FragColor = vec4( ${debug}, 1.0 );`);
    sh.fragmentShader = fr;
  };
  lit(m, { key: 'skin', baked: true });

  const o = mesh(skin, m);
  place.set(o.position.x, o.position.y, o.position.z, o.scale.x);
  // It lays the moon's shadow on itself (skin/shaders.ts, NIGHT), so the stage does not.
  o.castShadow = true;
  o.receiveShadow = false;
  const group = new THREE.Group();
  group.add(o);
  const at = query.get('skinat')?.split(',').map(Number);
  return {
    group,
    alone: at && at.length === 4 && at.every(Number.isFinite) ? { at: [at[0], at[1], at[2]], r: at[3] } : ALONE,
    dispose() { skin.geometry.dispose(); m.dispose(); map.dispose(); ck.seg.dispose(); ck.cell.dispose(); },
  };
};
