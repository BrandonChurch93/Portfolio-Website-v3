import * as THREE from 'three';
import { HOST, PYRAMID, SCALE, WORLD, ground } from '../layout';
import { GLINT, METAL, color, lit } from '../light';
import { load, mesh } from '../files';
import type { PartFactory } from '../part';
import { standing } from './pyramid/form';
import { shade } from './pyramid/shade';
import * as S from './pyramid/shaders';

// The pyramid: polished gold, at the front left edge of the land, a corner toward the visitor, standing straight out
// from the dome on the ground itself. Its body is cased in long unequal sheets in courses that thin upward, each
// sheet pillowed a hair and a few proud or dented, the cladding warping slowly over many sheets; a bevelled foot course stands proud round its foot,
// and a capstone sits over a dark reveal. Every arris is rounded. Its mesh and the light that reaches it are made
// ahead by scripts/world/parts/pyramid/make.mjs (public/world/pyramid.bin), in the pyramid's own frame. What each face
// mirrors, worked out from the real reflected ray at each pixel, is ./pyramid/shaders.ts, and the shade it lays on the
// ground round its foot ./pyramid/shade.ts.
// While it is being judged, ?pyr=zen=6,rim=5 sets any number of LOOK by its short name (see t() below), and
// ?pyrn=lit.glare.heart[0]=1.6,sweep.lit.down=0.02 any number of NIGHT by its path. ?pyrshade=0 leaves out the shade on the
// ground and ?pyrcast=0 its shadow in the moon's map.

const LOOK = {
  // The body's roughness, the capstone's, and how much each plate's polish differs, as a share of how soft what it
  // mirrors is.
  rough: { body: 0.2, cap: 0.1, vary: 0.2 },
  // The light high overhead toward the moon, which the rounded front arris turns to from just past its middle to
  // near the face toward the moon, so its line runs on into what that face mirrors: its direction, how bright, and
  // where its edge begins and ends as the cosine from it.
  zenith: { dir: [0.43, 0.89, 0], power: 6, edge: [0.829, 0.927] },
  // The glow along the horizon behind the world and to the right, which the rounded right hand outline turns to over
  // all of its round that is seen: how bright, and from what height to what height, as the sine of the angle over
  // the horizon. It stops short of what the face toward the moon mirrors.
  rim: [1.3, 0, 0.45],
  // The gold's colors, each at the world's gold's hue (METAL.gold) turned so many degrees, at full value: its
  // saturation where it mirrors least, in its body (the lit face's night, the long reflections), where it mirrors
  // much, in the warm glow at the dark face's foot, on the face toward the moon where it mirrors the dark sky (a rich
  // amber gold: at the body's hue it read as olive), and in the moon's glare. Gold is richest in its middle tones: held at the darks'
  // saturation there it read as khaki or brass. Then over what levels the deep turns to the body, the body to the
  // bright, and the bright pales toward cream. The deep is turned toward red and the bright toward cream: one hue from
  // the deepest shade to the palest read as a grade laid over grey.
  sat: { deep: 0.56, deepTurn: -6, body: 0.6, bodyTurn: -3.5, mid: 0.78, midTurn: -3, warm: 0.72, warmTurn: -8, lit: 0.8, litTurn: -4, hot: 0.6, hotTurn: -1 },
  grade: [0.02, 0.09, 0.22, 0.75, 0.7, 3.0],
  // The face toward the moon: over what levels its rich gold turns to the glare's hot gold, and the hot gold to pale.
  hot: [0.3, 1, 1, 3],
  // The highlights' cream: the palette's pale with its blue taken down so its hue is turned toward cream, inside the
  // palette's pale (its green and blue no higher than pale's).
  cream: 0.94,
  // How much of the world's contact shadow a mirror keeps where it is shut in.
  contact: 0.3,
  // How much of the moon's own light the faces take as a light: none, for they mirror the moon where their night has
  // it, and as a light it laid one even sheen over each face.
  moon: 0,
};

type Shader = THREE.WebGLProgramParametersWithUniforms;
const after = (src: string, chunk: string, add: string): string => src.replace(`#include <${chunk}>`, `#include <${chunk}>\n${add}`);
const v3 = (a: readonly number[]): THREE.Vector3 => new THREE.Vector3(a[0], a[1], a[2]);

// A color at the world's gold's hue (turned by `turn` degrees) and this saturation, at full value, in linear light
// with its red at 1.
function tint(sat: number, turn = 0): THREE.Vector3 {
  const hsl = { h: 0, s: 0, l: 0 };
  METAL.gold.getHSL(hsl, THREE.SRGBColorSpace);
  const h = Math.min(60, Math.max(0, hsl.h * 360 + turn)), b = 1 - sat, g = b + ((1 - b) * h) / 60;
  const c = new THREE.Color().setRGB(1, g, b, THREE.SRGBColorSpace);
  return new THREE.Vector3(1, c.g / c.r, c.b / c.r);
}

// Sets NIGHT's numbers by path from ?pyrn=, for judging.
function tuned(asked: string): S.Night {
  const N = structuredClone(S.NIGHT) as S.Night;
  for (const kv of asked.split(',').filter(Boolean)) {
    const [path, value] = kv.split('='), keys = path.split('.'), last = keys.pop() as string;
    let o: Record<string, unknown> = N as unknown as Record<string, unknown>;
    for (const k of keys) o = o[k] as Record<string, unknown>;
    const at = /^(.*)\[(\d)\]$/.exec(last);
    if (at) (o[at[1]] as number[])[Number(at[2])] = Number(value);
    else o[last] = Number(value);
  }
  return N;
}

export const build: PartFactory = async (ctx) => {
  const asked = new Map((ctx.query.get('pyr') ?? '').split(',').filter(Boolean).map((kv) => kv.split('=') as [string, string]));
  const t = (name: string, v: number): number => (asked.has(name) ? Number(asked.get(name)) : v);
  const F = S.frag(tuned(ctx.query.get('pyrn') ?? ''));
  const file = await load('pyramid.bin');
  const gold = file.meshes.get('gold');
  if (!gold) throw new Error('pyramid.bin holds no gold: make it again with scripts/world/parts/pyramid/make.mjs');

  const foot = ground(PYRAMID.x, PYRAMID.z), tall = PYRAMID.tall;
  const ax = standing(PYRAMID.x, PYRAMID.z, WORLD.top, PYRAMID.turn);
  const basis = new THREE.Matrix4().makeBasis(v3(ax.x), v3(ax.y), v3(ax.z));
  const at = new THREE.Vector3(PYRAMID.x, foot, PYRAMID.z);
  const pale = color('pale');

  const goldM = new THREE.MeshPhysicalMaterial({ color: METAL.gold, metalness: 1, roughness: LOOK.rough.body });
  goldM.onBeforeCompile = (sh: Shader) => {
    Object.assign(sh.uniforms, {
      uAt: { value: gold.at }, uSize: { value: gold.size }, uUnit: { value: SCALE },
      // The frame's glint stands out from the middle of the view by the cursor's offset in the host, measured in
      // host heights, times GLINT.range.
      uCursor: { value: HOST.tall * SCALE * GLINT.range },
      uZen: { value: new THREE.Vector4(...v3(LOOK.zenith.dir).normalize().toArray(), t('zen', LOOK.zenith.power)) },
      uZenW: { value: new THREE.Vector2(t('z0', LOOK.zenith.edge[0]), t('z1', LOOK.zenith.edge[1])) },
      uRim: { value: new THREE.Vector3(t('rim', LOOK.rim[0]), t('rimlo', LOOK.rim[1]), t('rimhi', LOOK.rim[2])) },
      uDeepC: { value: tint(t('sd', LOOK.sat.deep), t('dt', LOOK.sat.deepTurn)) },
      uBodyC: { value: tint(t('sb', LOOK.sat.body), t('bt', LOOK.sat.bodyTurn)) },
      uMidC: { value: tint(t('sm', LOOK.sat.mid), t('mt', LOOK.sat.midTurn)) },
      uWarmC: { value: tint(t('sw', LOOK.sat.warm), t('wt', LOOK.sat.warmTurn)) },
      uLitC: { value: tint(t('sl', LOOK.sat.lit), t('lt', LOOK.sat.litTurn)) },
      uHotC: { value: tint(t('sh', LOOK.sat.hot), t('ht', LOOK.sat.hotTurn)) },
      uHotAt: { value: new THREE.Vector4(t('h0', LOOK.hot[0]), t('h1', LOOK.hot[1]), t('h2', LOOK.hot[2]), t('h3', LOOK.hot[3])) },
      uPaleC: { value: new THREE.Vector3(1, pale.g / pale.r, (pale.b * t('cream', LOOK.cream)) / pale.r) },
      uGradeLo: { value: new THREE.Vector2(t('g0', LOOK.grade[0]), t('g1', LOOK.grade[1])) },
      uGradeAt: { value: new THREE.Vector4(t('g2', LOOK.grade[2]), t('g3', LOOK.grade[3]), t('g4', LOOK.grade[4]), t('g5', LOOK.grade[5])) },
      uRough: { value: new THREE.Vector3(t('rough', LOOK.rough.body), t('cap', LOOK.rough.cap), t('vary', LOOK.rough.vary)) },
      uContact: { value: t('contact', LOOK.contact) },
      uMoonSpec: { value: t('moon', LOOK.moon) },
      uToWorld: { value: new THREE.Matrix3().setFromMatrix4(basis) },
    });
    sh.vertexShader = after(after(sh.vertexShader, 'common', S.VERT_PARS), 'begin_vertex', S.VERT);
    let fr = after(sh.fragmentShader, 'common', F.PARS);
    fr = after(fr, 'color_fragment', F.COLOR);
    fr = after(fr, 'roughnessmap_fragment', F.ROUGH);
    fr = after(fr, 'normal_fragment_maps', F.NORMAL);
    fr = fr.replace('#include <lights_fragment_end>', `${F.ENV}\n#include <lights_fragment_end>`);
    fr = fr.replace('#include <opaque_fragment>', `${F.GRADE}\n#include <opaque_fragment>`);
    sh.fragmentShader = fr;
  };
  lit(goldM, { key: 'pyramid-gold', baked: true, core: false, glint: true });

  const frame = new THREE.Group();
  frame.position.copy(at);
  frame.quaternion.setFromRotationMatrix(basis);
  const o = mesh(gold, goldM);
  o.castShadow = ctx.query.get('pyrcast') !== '0';
  o.receiveShadow = ctx.query.get('pyrshadow') === '1';
  frame.add(o);
  const group = new THREE.Group();
  group.add(frame);
  const sheet = file.meshes.get('shade'), under = !sheet || ctx.query.get('pyrshade') === '0' ? null : shade(sheet, at, basis);
  if (under) group.add(under.mesh);
  return {
    group,
    alone: { at: [PYRAMID.x, foot + tall * 0.42, PYRAMID.z], r: PYRAMID.base * 0.68 },
    dispose() { gold.geometry.dispose(); sheet?.geometry.dispose(); goldM.dispose(); under?.dispose(); },
  };
};
