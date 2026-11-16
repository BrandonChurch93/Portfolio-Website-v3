import * as THREE from 'three';
import { hex, type PaletteName } from '../../../config/palette';
import { RIM, WORLD } from '../layout';
import { load, mesh } from '../files';
import { lit } from '../light';
import type { PartFactory } from '../part';
import { GLOW, STONE } from './skin/look';
import * as S from './skin/shaders';

// The skin: what survives of the planet's own outer surface at each side of the tear. At the visitor's left, turned
// from the moon, a deep warm near black cut by cracks with the core's light deep in them; at the right, under the
// moon, the pale stone with its craters. Its mesh and its map are made ahead by scripts/world/parts/skin/make.mjs
// (public/world/skin.bin and skin-map.bin): the craters, the wide part of the cracks and the broken crust at the torn
// edges are geometry, and the map, laid over picture 9's own pixels, holds the relief finer than that, the stone's
// color and the cracks' light. ?skinat=x,y,z,r frames the skin alone on any place of it.

type Shader = THREE.WebGLProgramParametersWithUniforms;
const after = (src: string, chunk: string, add: string): string => {
  if (!src.includes(`#include <${chunk}>`)) throw new Error(`skin: the standard shader has no ${chunk}`);
  return src.replace(`#include <${chunk}>`, `#include <${chunk}>\n${add}`);
};
const linear = (name: PaletteName): THREE.Color => new THREE.Color(hex(name));
const stone = (s: { from: PaletteName; to: PaletteName; k: number; power: number }): THREE.Color => linear(s.from).lerp(linear(s.to), s.k).multiplyScalar(s.power);
// Seen alone, this place of it fills the frame.
const ALONE = { at: [0, -260, 0] as [number, number, number], r: 700 };
// While the rock still draws its own plain outer surface where the skin is, ?skinlift=1 lifts the skin clear of it
// by so many units, only for looking at it.
const LIFT = 14;

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

export const build: PartFactory = async ({ query, renderer }) => {
  const [file, map] = await Promise.all([load('skin.bin'), readMap('skin-map.bin')]);
  const skin = file.meshes.get('skin');
  if (!skin) throw new Error('skin.bin holds no skin: make it again with scripts/world/parts/skin/make.mjs');
  map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0 });
  m.onBeforeCompile = (sh: Shader) => {
    Object.assign(sh.uniforms, {
      uSkinMap: { value: map },
      uSkinMapSize: { value: new THREE.Vector3(map.image.width, map.image.height, map.userData.split as number) },
      uPale: { value: stone(STONE.pale) }, uDust: { value: stone(STONE.dust) }, uDark: { value: stone(STONE.dark) },
      uGlowPale: { value: linear(GLOW.ramp[0][0]) }, uGlowHot: { value: linear(GLOW.ramp[1][0]) }, uGlowFlame: { value: linear(GLOW.ramp[2][0]) }, uGlowEmber: { value: linear(GLOW.ramp[3][0]) },
    });
    sh.vertexShader = after(after(sh.vertexShader, 'common', S.VERT_PARS), 'begin_vertex', S.VERT);
    let fr = after(sh.fragmentShader, 'common', S.FRAG_PARS);
    fr = after(fr, 'color_fragment', S.COLOR);
    fr = after(fr, 'normal_fragment_maps', S.NORMAL);
    fr = after(fr, 'emissivemap_fragment', S.EMIT);
    sh.fragmentShader = fr;
  };
  lit(m, { key: 'skin', baked: true });

  const o = mesh(skin, m);
  o.castShadow = o.receiveShadow = true;
  const group = new THREE.Group();
  group.add(o);
  if (query.get('skinlift') === '1') {
    const k = (WORLD.half + LIFT) / WORLD.half;
    group.scale.setScalar(k);
    group.position.set(0, -RIM * (1 - k), 0);
  }
  const at = query.get('skinat')?.split(',').map(Number);
  return {
    group,
    alone: at && at.length === 4 && at.every(Number.isFinite) ? { at: [at[0], at[1], at[2]], r: at[3] } : ALONE,
    dispose() { skin.geometry.dispose(); m.dispose(); map.dispose(); },
  };
};
