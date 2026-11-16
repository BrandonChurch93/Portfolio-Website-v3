import * as THREE from 'three';
import { HOST, PYRAMID, SCALE, WORLD, ground } from '../layout';
import { METAL, lit } from '../light';
import { load, mesh } from '../files';
import type { PartFactory } from '../part';
import { standing } from './pyramid/form';
import * as S from './pyramid/shaders';

// The pyramid: polished gold, at the front left edge of the land, a corner toward the visitor, standing straight out
// from the dome on the ground itself. Its body is cased in fine level courses of plates, each a hair different in
// tilt and polish, with a capstone in one piece over a dark reveal, and every arris rounded. Its mesh and the light
// that reaches it are made ahead by scripts/world/parts/pyramid/make.mjs (public/world/pyramid.bin), in the
// pyramid's own frame. What each face mirrors is ./pyramid/shaders.ts.
// While it is being judged, ?pyr=zen=6,rim=5 sets any number of LOOK by its short name (see t() below).

const LOOK = {
  // The body's roughness, the capstone's, and how much each plate's polish differs, as a share of how soft what it
  // mirrors is.
  rough: { body: 0.2, cap: 0.16, vary: 0.2 },
  // The light high overhead toward the moon, which the rounded front arris turns to from just past its middle to
  // near the face toward the moon, so its line runs on into what that face mirrors: its direction, how bright, and
  // where its edge begins and ends as the cosine from it.
  zenith: { dir: [0.43, 0.89, 0], power: 6, edge: [0.829, 0.927] },
  // The glow along the horizon behind the world and to the right, which the rounded right hand outline turns to over
  // all of its round that is seen: how bright, and from what height to what height, as the sine of the angle over
  // the horizon. It stops short of what the face toward the moon mirrors.
  rim: [5, 0, 0.45],
  // The color given to how much a place mirrors: green and blue against red through the middle levels, less
  // saturated than copper so it reads as gold, and over what levels it pales toward pale gold; and green and blue
  // against red in the deepest places, which are richer.
  grade: [0.48, 0.14, 1.6, 4.5],
  deep: [0.43, 0.095],
  // How much of the world's contact shadow a mirror keeps where it is shut in.
  contact: 0.3,
  // How much of the moon's own light the faces take as a light: none, for they mirror the moon where their night has
  // it, and as a light it laid one even sheen over each face.
  moon: 0,
  // The frame's cursor glint (GLINT in ../index.ts, which it does not export): how far its light ranges as a share of
  // the cursor's offset, and how far in front of the world it stands, in metres. From these the cursor's own ray is
  // found again, so the glint is under the cursor. The frame ranges it across by the host's height, and the host is
  // narrower than that (HOST).
  glint: { range: 1.3, back: 2.2 },
};

type Shader = THREE.WebGLProgramParametersWithUniforms;
const after = (src: string, chunk: string, add: string): string => src.replace(`#include <${chunk}>`, `#include <${chunk}>\n${add}`);
const v3 = (a: readonly number[]): THREE.Vector3 => new THREE.Vector3(a[0], a[1], a[2]);

export const build: PartFactory = async (ctx) => {
  const asked = new Map((ctx.query.get('pyr') ?? '').split(',').filter(Boolean).map((kv) => kv.split('=') as [string, string]));
  const t = (name: string, v: number): number => (asked.has(name) ? Number(asked.get(name)) : v);
  const file = await load('pyramid.bin');
  const gold = file.meshes.get('gold');
  if (!gold) throw new Error('pyramid.bin holds no gold: make it again with scripts/world/parts/pyramid/make.mjs');

  const foot = ground(PYRAMID.x, PYRAMID.z), tall = PYRAMID.tall;
  const ax = standing(PYRAMID.x, PYRAMID.z, WORLD.top, PYRAMID.turn);
  const basis = new THREE.Matrix4().makeBasis(v3(ax.x), v3(ax.y), v3(ax.z));
  const at = new THREE.Vector3(PYRAMID.x, foot, PYRAMID.z);

  const goldM = new THREE.MeshPhysicalMaterial({ color: METAL.gold, metalness: 1, roughness: LOOK.rough.body });
  goldM.onBeforeCompile = (sh: Shader) => {
    Object.assign(sh.uniforms, {
      uAt: { value: gold.at }, uSize: { value: gold.size }, uUnit: { value: SCALE },
      uZen: { value: new THREE.Vector4(...v3(LOOK.zenith.dir).normalize().toArray(), t('zen', LOOK.zenith.power)) },
      uZenW: { value: new THREE.Vector2(t('z0', LOOK.zenith.edge[0]), t('z1', LOOK.zenith.edge[1])) },
      uRim: { value: new THREE.Vector3(t('rim', LOOK.rim[0]), t('rimlo', LOOK.rim[1]), t('rimhi', LOOK.rim[2])) },
      uGrade: { value: new THREE.Vector4(t('gg', LOOK.grade[0]), t('gb', LOOK.grade[1]), t('g0', LOOK.grade[2]), t('g1', LOOK.grade[3])) },
      uRough: { value: new THREE.Vector3(t('rough', LOOK.rough.body), t('cap', LOOK.rough.cap), t('vary', LOOK.rough.vary)) },
      uDeep: { value: new THREE.Vector2(t('dg', LOOK.deep[0]), t('db', LOOK.deep[1])) },
      uContact: { value: t('contact', LOOK.contact) },
      uMoonSpec: { value: t('moon', LOOK.moon) },
      uGlintFrame: { value: new THREE.Vector3(LOOK.glint.range, LOOK.glint.back, HOST.wide / HOST.tall) },
      uToWorld: { value: new THREE.Matrix3().setFromMatrix4(basis) },
    });
    sh.vertexShader = after(after(sh.vertexShader, 'common', S.VERT_PARS), 'begin_vertex', S.VERT);
    let fr = after(sh.fragmentShader, 'common', S.FRAG_PARS);
    fr = after(fr, 'color_fragment', S.COLOR);
    fr = after(fr, 'roughnessmap_fragment', S.ROUGH);
    fr = after(fr, 'normal_fragment_maps', S.NORMAL);
    fr = fr.replace('#include <lights_fragment_end>', `${S.ENV}\n#include <lights_fragment_end>`);
    fr = fr.replace('#include <opaque_fragment>', `${S.GRADE}\n#include <opaque_fragment>`);
    sh.fragmentShader = fr;
  };
  lit(goldM, { key: 'pyramid-gold', baked: true, core: false, glint: true });

  const frame = new THREE.Group();
  frame.position.copy(at);
  frame.quaternion.setFromRotationMatrix(basis);
  const o = mesh(gold, goldM);
  o.castShadow = true;
  o.receiveShadow = ctx.query.get('pyrshadow') === '1';
  frame.add(o);
  const group = new THREE.Group();
  group.add(frame);
  return {
    group,
    alone: { at: [PYRAMID.x, foot + tall * 0.42, PYRAMID.z], r: PYRAMID.base * 0.68 },
    dispose() { gold.geometry.dispose(); goldM.dispose(); },
  };
};
