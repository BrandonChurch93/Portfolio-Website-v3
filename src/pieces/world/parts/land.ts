import * as THREE from 'three';
import { color, lit, stone } from '../light';
import { load, mesh } from '../files';
import type { PartFactory } from '../part';
import { TOWERS } from '../placed';
import { DUNES, GLSL, HEIGHT, MAP, RIDERS, ROW, crestTexels } from './land/field';
import * as S from './land/shaders';

// The land: the top of the planet that the city, the trees, the pyramid and the spire stand on, and the desert with
// its dunes. Its mesh and maps are made ahead by scripts/world/parts/land/make.mjs (public/world/land*): a fine
// height field reduced to what the eye can tell, ending on the land's edge with a thin turned down edge, and maps of
// what lies where, which lot a place is in, how open it is and the light that has bounced there. What each place is
// made of is worked out per pixel (./land/shaders.ts), and the dunes' slopes from the dune field itself
// (./land/field.ts), so every crest is sharp at any size.

// Each material's color, from the palette: the sand lit and in its hollows, the city's dark paving, its paler
// worn stone and the courts' pale flags, the grass in its autumn browns (lit, dry, in its clumps), the earth a break
// shows, the flat stones in the grass, and the bronze laid in the spire's court.
const mix = (a: THREE.Color, b: THREE.Color, k: number): THREE.Color => a.clone().lerp(b, k);
const LOOK = {
  sand: mix(color('hot'), color('copper'), 0.3).multiplyScalar(1.12),
  sandHi: mix(color('pale'), color('hot'), 0.1),
  sandRim: mix(color('pale'), color('hot'), 0.3),
  bare: mix(color('text-3'), color('copper-light'), 0.46).multiplyScalar(0.62),
  sandDeep: mix(color('copper'), color('ember'), 0.75).multiplyScalar(0.9),
  pave: mix(color('text-3'), color('copper-light'), 0.5).multiplyScalar(0.32),
  pavePale: mix(color('text-3'), color('copper-light'), 0.62).multiplyScalar(0.85),
  rock: stone(),
  court: mix(color('text-3'), color('copper-light'), 0.36).multiplyScalar(0.5),
  grass: mix(color('bronze'), color('copper'), 0.35).multiplyScalar(0.5),
  grassDry: mix(color('copper-light'), color('text-3'), 0.35).multiplyScalar(0.55),
  grassDeep: mix(color('bronze-deep'), color('ember'), 0.3).multiplyScalar(0.8),
  earth: mix(color('bronze-deep'), color('bronze'), 0.3).multiplyScalar(0.75),
  stone: mix(color('text-3'), color('text-2'), 0.4).multiplyScalar(0.6),
  bronze: color('bronze'),
};

// How much of a dielectric's usual reflection the land keeps.
const SHEEN = 0.35;

type Shader = THREE.WebGLProgramParametersWithUniforms;
const after = (src: string, chunk: string, add: string): string => {
  if (!src.includes(`#include <${chunk}>`)) throw new Error(`land: the standard shader has no ${chunk}`);
  return src.replace(`#include <${chunk}>`, `#include <${chunk}>\n${add}`);
};

function picture(file: string, nearest: boolean): Promise<THREE.Texture> {
  return new THREE.TextureLoader().loadAsync(`/world/${file}`).then((t) => {
    t.colorSpace = THREE.NoColorSpace;
    t.flipY = false;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
    t.minFilter = nearest ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = !nearest;
    t.needsUpdate = true;
    return t;
  });
}
function floats(data: Float32Array, wide: number, tall: number): THREE.DataTexture {
  const t = new THREE.DataTexture(data, wide, tall, THREE.RGBAFormat, THREE.FloatType);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

// The sand's height over the dome on the grid HEIGHT, drawn once on the graphics card from the same dune field as
// everything else, for the ray to the moon to read in one look a step in place of working every dune out again.
function heights(renderer: THREE.WebGLRenderer, mapA: THREE.Texture, crest: THREE.Texture): THREE.WebGLRenderTarget {
  const target = new THREE.WebGLRenderTarget(HEIGHT.texels[0], HEIGHT.texels[1], { type: THREE.HalfFloatType, format: THREE.RedFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false });
  const f = (v: number): string => v.toFixed(4);
  const material = new THREE.ShaderMaterial({
    uniforms: { uMapA: { value: mapA }, uCrest: { value: crest } },
    vertexShader: 'varying vec2 vAt;\nvoid main() { vAt = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D uMapA;\nvarying vec2 vAt;\n${GLSL}\nvoid main() {\n\tvec2 p = vec2(${f(HEIGHT.lo[0])}, ${f(HEIGHT.lo[1])}) + vAt * vec2(${f(HEIGHT.size[0])}, ${f(HEIGHT.size[1])});\n\tvec3 A = texture2D(uMapA, (p - ${f(MAP.lo)}) / ${f(MAP.size)}).rgb;\n\tgl_FragColor = vec4(A.g * landRelief(p, A.b * 64.0), 0.0, 0.0, 1.0);\n}`,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material), scene = new THREE.Scene();
  quad.frustumCulled = false;
  scene.add(quad);
  const was = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
  renderer.setRenderTarget(was);
  quad.geometry.dispose();
  material.dispose();
  return target;
}

export const build: PartFactory = async ({ query, renderer }) => {
  if (query.get('landdebug') === 'off') return { group: new THREE.Group() };
  const [file, a, b, lots, light] = await Promise.all([load('land.bin'), picture('land-a.png', false), picture('land-b.png', false), picture('land-lots.png', true), picture('land-light.png', false)]);
  const ground = file.meshes.get('ground');
  if (!ground) throw new Error('land.bin holds no ground: make it again with scripts/world/parts/land/make.mjs');
  const crest = floats(crestTexels(), ROW, DUNES.length + RIDERS.length);
  const high = heights(renderer, a, crest);
  const towers = new Float32Array(TOWERS.length * 8);
  TOWERS.forEach(([x, z, w, d, tall, turn], i) => {
    const r = (turn * Math.PI) / 180;
    towers.set([x, z, Math.cos(r), Math.sin(r)], i * 8);
    towers.set([w, d, tall, 0], i * 8 + 4);
  });
  const lots3 = floats(towers, 2, TOWERS.length);
  const counts = { map: (a.image as HTMLImageElement).width, lots: (lots.image as HTMLImageElement).width };

  // Stone, sand and grass reflect little: seen nearly edge on, a full reflection turned the dark paving a pale grey.
  // Drawn from both sides: the reduced mesh turns a few of its steepest triangles, at a kerb, a slab's step or a
  // crest, a little past upright, and seen from the back they were holes. The shader takes its normal from the
  // mesh's vertices and the land's own shape, so a turned triangle is lit as the ground round it.
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, specularIntensity: SHEEN, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh: Shader) => {
    Object.assign(sh.uniforms, {
      uAt: { value: ground.at }, uSize: { value: ground.size },
      uMapA: { value: a }, uMapB: { value: b }, uLight: { value: light }, uLots: { value: lots }, uTowers: { value: lots3 }, uCrest: { value: crest }, uHeight: { value: high.texture },
      uRock: { value: LOOK.rock }, uSand: { value: LOOK.sand }, uSandHi: { value: LOOK.sandHi }, uSandRim: { value: LOOK.sandRim }, uBare: { value: LOOK.bare }, uSandDeep: { value: LOOK.sandDeep }, uPave: { value: LOOK.pave }, uPavePale: { value: LOOK.pavePale }, uCourt: { value: LOOK.court },
      uGrass: { value: LOOK.grass }, uGrassDry: { value: LOOK.grassDry }, uGrassDeep: { value: LOOK.grassDeep }, uEarth: { value: LOOK.earth }, uStone: { value: LOOK.stone }, uBronze: { value: LOOK.bronze },
    });
    sh.vertexShader = after(after(sh.vertexShader, 'common', S.VERT_PARS), 'begin_vertex', S.VERT);
    let fr = after(sh.fragmentShader, 'normal_pars_fragment', S.fragPars(counts));
    fr = after(fr, 'color_fragment', S.COLOR);
    fr = after(fr, 'roughnessmap_fragment', S.ROUGH);
    fr = after(fr, 'metalnessmap_fragment', S.METAL);
    fr = after(fr, 'normal_fragment_maps', S.NORMAL);
    fr = after(fr, 'lights_fragment_begin', S.DIRECT);
    if (query.get('landdebug')) fr = fr.replace('#include <opaque_fragment>', `#include <opaque_fragment>\ngl_FragColor = vec4(${query.get('landdebug')}, 1.0);`);
    fr = fr.replace('#include <lights_fragment_end>', `${S.LIGHT_END}\n#include <lights_fragment_end>`);
    sh.fragmentShader = fr;
  };
  lit(m, { key: 'land', core: false, glint: false });

  const o = mesh(ground, m);
  o.castShadow = true;
  o.receiveShadow = true;
  const group = new THREE.Group();
  group.add(o);
  return {
    group,
    // ?landat=x,y,z,r frames the land alone on any place of it, for judging one place close.
    alone: (() => { const [x, y, z, r] = (query.get('landat') ?? '0,0,120,560').split(',').map(Number); return { at: [x, y, z] as [number, number, number], r }; })(),
    dispose() { ground.geometry.dispose(); m.dispose(); for (const t of [a, b, lots, light, crest, lots3]) t.dispose(); high.dispose(); },
  };
};
