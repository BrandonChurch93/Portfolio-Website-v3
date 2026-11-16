import * as THREE from 'three';
import { D2R, PYRAMID, SCALE, VIEW, WORLD, ground } from '../layout';
import { METAL, lit } from '../light';
import { load, mesh } from '../files';
import type { PartFactory } from '../part';
import { FORM, standing } from './pyramid/form';
import * as S from './pyramid/shaders';

// The pyramid: polished gold, at the front left edge of the land, a corner toward the visitor, standing straight out
// from the dome on the ground itself. Its body is cased in fine level courses of plates, with a capstone in one
// piece over a dark reveal, and every arris rounded. Its mesh and the light that reaches it are made ahead by
// scripts/world/parts/pyramid/make.mjs (public/world/pyramid.bin), in the pyramid's own frame.
// While it is being judged, ?pyr=hi0=1.4,zen=2 sets any number of LOOK by its short name (see t() below): a soft
// light's by its name and its number.

const LOOK = {
  // The body's roughness, the capstone's, and how much each plate's differs at most.
  rough: { body: 0.2, cap: 0.16, vary: 0.012 },
  // The soft lights of the night, each placed by where its middle lands on the face that mirrors it: the face toward
  // the moon, the pyramid's own +z face, or the face turned from it, its -x face. Where (across from the face's
  // middle toward its right hand corner, and up from its foot, in units), how far off it stands, its heart's radii
  // and its broad light's (across and up, in units), how bright each is, and how soft the broad light's edge.
  // The face toward the moon mirrors a wide glow, and inside it a brighter light whose edge crosses the face, and a
  // hot heart low and to the right. The face turned from it mirrors the city's glow, low by the front arris.
  soft: [
    { face: 'lit', across: 0, up: 30, far: 400, heart: [170, 150], broad: [122, 96], power: [0.6, 0.8], edge: 0.1 },
    { face: 'lit', across: -4, up: 18, far: 400, heart: [56, 44], broad: [1, 1], power: [1.8, 0], edge: 0.1 },
    { face: 'dark', across: 60, up: -20, far: 300, heart: [40, 30], broad: [95, 45], power: [0.1, 0.16], edge: 0.9 },
  ],
  // The night: how bright overhead, at the horizon, and beneath.
  sky: [0.05, 0.1, 0],
  // The light high overhead toward the moon, which the rounded front arris turns to from just past its middle to
  // near the face toward the moon, so its line runs on into what that face mirrors: its
  // direction, how bright, and where its edge begins and ends as the cosine from it.
  zenith: { dir: [0.43, 0.89, 0], power: 6, edge: [0.829, 0.927] },
  // The glow along the horizon behind the world and to the right, which the rounded right hand outline turns to over
  // all of its round that is seen: how bright, and from what height to what height, as the sine of the angle over
  // the horizon. It stops short of what the face toward the moon mirrors.
  rim: [5, 0, 0.45],
  // The color given to how much a place mirrors: green and blue against red where it mirrors little, and over what
  // levels it pales toward pale gold.
  grade: [0.43, 0.095, 1.5, 3.8],
  // How much of the world's contact shadow a mirror keeps where it is shut in.
  contact: 0.3,
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

  const foot = ground(PYRAMID.x, PYRAMID.z), half = PYRAMID.base / 2, tall = FORM.fit.tall;
  const ax = standing(PYRAMID.x, PYRAMID.z, WORLD.top, FORM.fit.turn);
  const basis = new THREE.Matrix4().makeBasis(v3(ax.x), v3(ax.y), v3(ax.z));
  const at = new THREE.Vector3(PYRAMID.x, foot, PYRAMID.z);
  const toWorld = (p: THREE.Vector3): THREE.Vector3 => p.applyMatrix4(basis).add(at);

  const view = new THREE.Vector3(0, Math.sin(VIEW.el * D2R), Math.cos(VIEW.el * D2R));
  const lights = LOOK.soft.map((l, i) => {
    const k = (name: string, v: number): number => t(`${name}${i}`, v), up = k('up', l.up), w = half * (1 - up / tall), a = k('across', l.across);
    const local = l.face === 'lit' ? new THREE.Vector3(a, up, w) : new THREE.Vector3(-w, up, a);
    const n = (l.face === 'lit' ? new THREE.Vector3(0, half, tall) : new THREE.Vector3(-tall, half, 0)).normalize().applyMatrix4(basis);
    const r = n.clone().multiplyScalar(2 * n.dot(view)).sub(view).normalize();
    const u = new THREE.Vector3().crossVectors(r, new THREE.Vector3(0, 1, 0)).normalize();
    return {
      at: toWorld(local).addScaledVector(r, k('far', l.far)), u, v: new THREE.Vector3().crossVectors(u, r).normalize(),
      radii: new THREE.Vector4(k('hu', l.heart[0]), k('hv', l.heart[1]), k('bu', l.broad[0]), k('bv', l.broad[1])),
      power: new THREE.Vector3(k('hi', l.power[0]), k('bi', l.power[1]), k('edge', l.edge)),
    };
  });

  const goldM = new THREE.MeshPhysicalMaterial({ color: METAL.gold, metalness: 1, roughness: LOOK.rough.body });
  goldM.onBeforeCompile = (sh: Shader) => {
    Object.assign(sh.uniforms, {
      uAt: { value: gold.at }, uSize: { value: gold.size }, uUnit: { value: SCALE },
      uSoftAt: { value: lights.map((l) => l.at) }, uSoftU: { value: lights.map((l) => l.u) }, uSoftV: { value: lights.map((l) => l.v) },
      uSoftR: { value: lights.map((l) => l.radii) }, uSoftI: { value: lights.map((l) => l.power) },
      uSky: { value: new THREE.Vector3(t('sky', LOOK.sky[0]), t('hor', LOOK.sky[1]), t('below', LOOK.sky[2])) },
      uZen: { value: new THREE.Vector4(...v3(LOOK.zenith.dir).normalize().toArray(), t('zen', LOOK.zenith.power)) },
      uZenW: { value: new THREE.Vector2(t('z0', LOOK.zenith.edge[0]), t('z1', LOOK.zenith.edge[1])) },
      uRim: { value: new THREE.Vector3(t('rim', LOOK.rim[0]), t('rimlo', LOOK.rim[1]), t('rimhi', LOOK.rim[2])) },
      uGrade: { value: new THREE.Vector4(t('gg', LOOK.grade[0]), t('gb', LOOK.grade[1]), t('g0', LOOK.grade[2]), t('g1', LOOK.grade[3])) },
      uRough: { value: new THREE.Vector3(t('rough', LOOK.rough.body), t('cap', LOOK.rough.cap), t('vary', LOOK.rough.vary)) },
      uContact: { value: t('contact', LOOK.contact) },
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
