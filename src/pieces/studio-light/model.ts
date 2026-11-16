import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { hex } from '../../config/palette';
import { Builder, pause, rbox, xf } from '../../world/build';
import { circle, inset, rounded, rrect, screw, slab, type V } from '../../world/shape';
import { dielectric, metal } from '../../world/surface';
import { type GlintUniforms, capGlint, glintUniforms, takeGlint, withGlint } from '../../world/glint';
import { LENS, LENS_MIDDLE, lensGeometry, lensMaterial } from './lens';

// The studio light, in millimetres under a root scaled by 0.001. The wall is the plane z = 0 and the visitor looks
// straight at it down -z. The head is built in its own frame: z along the beam, y over the top, x across, with the
// tilt axis on x. The yoke pans about the upright spigot and the head tilts in it, so the head's x is level.

const D2R = Math.PI / 180;

export const SL = {
  SCALE: 0.001,
  // The drum's radius, and where along the head the tilt axis crosses it.
  R: 92,
  TILT_Z: -24,
  // The back face of the rear cap, on the axis.
  REAR: -114,
  // How far the head turns out of the wall toward the visitor, and its aim on the screen.
  TOWARD: 30,
  AIM: 52,
  // The pivot, out from the wall.
  PIVOT: [0, 0, 215] as const,
  // The yoke: its arms' centres either side of the axis, the crossbar's centre over the pivot, the flat bar.
  YOKE_W: 112,
  YOKE_H: 150,
  BAR_T: 7,
  BAR_W: 32,
  // The barn doors: the frame's half width and its front face, the turn of the rotating ring, and each leaf.
  FRAME: 100,
  FRAME_Z: 93,
  DOORS_TURN: 28,
  BIG: { len: 74, tip: 106, flare: 62 },
  SMALL: { len: 58, tip: 56, flare: 52 },
} as const;

type RZ = [number, number];
const PATINA: [number, number, number] = [0.72, 0.62, 0.54];

// A part turned about z, from its outside traced from the back of the axis round to the front, so its faces look out.
// teeth cuts its rim (every point at or past from) into n ridges depth deep: a knurl or a toothed disc.
function turned(profile: RZ[], seg = 96, teeth?: { n: number; depth: number; from: number }): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), teeth ? teeth.n * 4 : seg);
  g.rotateX(Math.PI / 2);
  if (teeth) {
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y);
      if (r < teeth.from - 1e-3) continue;
      const a = Math.atan2(y, x);
      const w = Math.abs(((((a / (Math.PI * 2)) * teeth.n) % 1) + 1) % 1 * 2 - 1);
      const k = (r - teeth.depth * w) / r;
      p.setXY(i, x * k, y * k);
    }
  }
  return toCreasedNormals(g, 38 * D2R);
}

// A matrix that stands a part on the drum at angle a round the axis and z along it, its own z looking out.
function onDrum(a: number, z: number, r: number, spin = 0): THREE.Matrix4 {
  const rad = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
  const ax = new THREE.Vector3(0, 0, 1);
  const x = new THREE.Vector3().crossVectors(ax, rad);
  const m = new THREE.Matrix4().makeBasis(x, ax, rad).setPosition(rad.clone().multiplyScalar(r).setZ(z));
  return spin ? m.multiply(new THREE.Matrix4().makeRotationZ(spin)) : m;
}

const dome = (r: number, seg = 14) => { const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg >> 1), 0, Math.PI * 2, 0, Math.PI / 2); g.rotateX(Math.PI / 2); g.scale(1, 1, 0.55); return g; };

// A straight run of tube between two points.
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 12): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  g.translate(a.x, a.y, a.z);
  return g;
}

// The type plate: a made up model code and serial, cut into bronze and filled dark.
function plateMaterial(): THREE.MeshPhysicalMaterial {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  g.lineWidth = 10;
  g.beginPath(); g.roundRect(26, 26, c.width - 52, c.height - 52, 26); g.stroke();
  g.textBaseline = 'middle';
  g.font = '700 118px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Menlo, monospace';
  g.textAlign = 'center';
  g.fillText('FR·150', c.width / 2, 150);
  g.fillRect(90, 232, c.width - 180, 8);
  g.font = '600 74px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Menlo, monospace';
  g.fillText('650W  Nº 0417', c.width / 2, 318);
  g.fillText('TYPE K2 · 120V', c.width / 2, 412);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  const m = new THREE.MeshPhysicalMaterial({ color: hex('bronze'), metalness: 1, roughness: 0.3 });
  m.name = 'slPlate';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uEng = { value: t };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vEngUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEngUv = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uEng;\nvarying vec2 vEngUv;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat engK = texture2D(uEng, vEngUv).r;\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.018, 0.011), engK);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.7, engK);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, engK);');
  };
  m.customProgramCacheKey = () => 'slPlate';
  return m;
}

// The lamp house seen through the louvres and round the rear cap: hottest round the lamp, falling off toward the
// back, a little uneven round the drum as a reflector's light is.
function glowMaterial(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uK; varying vec3 vP;
void main(){
  float a = atan(vP.y, vP.x);
  float g = exp(-pow((vP.z + 42.0) / 34.0, 2.0)) * 0.85 + 0.2;
  g *= 0.82 + 0.18 * sin(a * 3.0 + 1.1) * sin(a * 5.0 + 0.3);
  float I = uK * g;
  vec3 col = mix(${linOf('ember')}, ${linOf('flame')}, smoothstep(0.0, 0.45, I));
  col = mix(col, ${linOf('hot')}, smoothstep(0.7, 1.2, I));
  gl_FragColor = vec4(col * I * 1.7, 1.0);
}`,
  });
  m.name = 'slGlow';
  return m;
}
const linOf = (name: 'ember' | 'flame' | 'hot') => { const c = new THREE.Color(hex(name)); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };

// How much of the room the metal takes, against the stage's own level: enough that its rounded edges hold a line of
// light with the cursor far away, so the light can be found on the page before the stream reaches it.
const EDGE_ROOM = 2.1;
// The brightest the bronze and the drum's line are drawn, under the stage's glow threshold (1.6 in ./index.ts): the lamp
// met at the mirror angle on the bezel bloomed into a soft spot. Nothing under this is changed.
const BRONZE_TOP = 1.5;

// Holds a metal's brightest light under a level, keeping its hue, so a highlight stays a crisp line or point and never
// blooms into a soft spot.
function capBright(m: THREE.MeshPhysicalMaterial, top: number): void {
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight *= min(1.0, ${top.toFixed(2)} / max(1e-4, max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b))));\n#include <opaque_fragment>`);
  };
}

// The cursor's glint (../../world/glint.ts) on the drum's shell only, in the palette's copper: one tight line along the
// drum wherever the pointer is, which the piece places (./index.ts, DRUM). Every other part is lit as it was. The yoke
// had a line too: a hair at the page's size, and a hard bright bar on the crossbar with the pointer low and left.
const GLINT = { tint: 'copper', sharp: 2500, k: 0.7, pale: 0.15, turned: true, unshadowed: true } as const;

// A barn door leaf's face, read in the leaf's own millimetres (its uv: across the hinge, and out from it) and its sizes
// (cell: half the hinge, half the tip, its length, and 1 on a leaf). Steel goes a warm brown toward the hinge where
// the lamp heats it, and is rubbed back to bare metal at the corners and round the tab. The inner face takes the
// lamp's light falling off from the hinge out.
function leafMaterial(name: string, color: number, rough: number, coat: number, inner: boolean): THREE.MeshPhysicalMaterial {
  const bare = new THREE.Color(hex('bronze')), ember = new THREE.Color(hex('flame'));
  const v3 = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
  const m = dielectric(name, color, rough, {
    coat, vary: 0.18, scale: 0.08,
    extra: {
      vhead: 'attribute vec4 cell; varying vec2 vLeafUv; varying vec4 vLeaf;',
      vert: 'vLeafUv = uv; vLeaf = cell;',
      head: 'varying vec2 vLeafUv; varying vec4 vLeaf; uniform float uLeafLit;',
      color: `
  float lv = max(vLeafUv.y, 0.0), lu = vLeafUv.x;
  float heat = exp(-lv / ${inner ? '38.0' : '34.0'}) * vLeaf.w;
  vec2 q = vec2(abs(lu), lv);
  float dw = min(min(length(q - vec2(vLeaf.x, 2.0)), length(q - vec2(vLeaf.y, vLeaf.z))), length(vec2(lu, lv) - vec2(vLeaf.y * 0.62, vLeaf.z - 2.0)) * 1.15);
  float rub = wNoise(vec3(vLeafUv * 0.42, 7.0)) * 0.7 + wNoise(vec3(vLeafUv * 1.3, 2.0)) * 0.3;
  float wear = (1.0 - smoothstep(5.0, ${inner ? '16.0' : '26.0'}, dw)) * smoothstep(0.36, 0.55, rub + (1.0 - smoothstep(0.0, 12.0, dw)) * 0.35) * vLeaf.w;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.05, 0.012) * (0.75 + 0.5 * rub), heat * ${inner ? '0.85' : '0.8'});
  diffuseColor.rgb = mix(diffuseColor.rgb, ${v3(bare)}, wear);`,
      rough: 'roughnessFactor = mix(roughnessFactor, 0.26, wear); roughnessFactor = mix(roughnessFactor, 0.3, heat * 0.8);',
      metal: 'metalnessFactor = mix(metalnessFactor, 1.0, wear);',
      emissive: inner ? `
  {
    // The lamp's light lands in a band beside the hinge, nearest the lens, and is gone well before the tip. The panel
    // pressed into the leaf is a hollow on this face: its rim toward the lens catches the light, the far rim and the
    // hollow sit in shade, and the crease down the middle throws a line of shadow with a lit edge beside it.
    float slope = (vLeaf.y - vLeaf.x) / max(vLeaf.z - 2.0, 1.0);
    float half_ = vLeaf.x + slope * clamp(lv - 2.0, 0.0, vLeaf.z);
    float dSide = (half_ - abs(lu)) * inversesqrt(1.0 + slope * slope);
    float dEdge = min(min(dSide, lv - 2.0), vLeaf.z - lv);
    float hollow = smoothstep(8.5, 10.5, dEdge);
    float rim = smoothstep(7.0, 8.6, dEdge) * (1.0 - smoothstep(8.6, 10.4, dEdge));
    float near = 1.0 - smoothstep(0.0, vLeaf.z * 0.55, lv);
    float onCrease = step(14.0, lv) * step(lv, vLeaf.z - 16.0);
    float creaseDark = (1.0 - smoothstep(0.8, 2.6, abs(lu))) * onCrease;
    float creaseLit = smoothstep(2.4, 3.2, lu) * (1.0 - smoothstep(3.2, 4.6, lu)) * onCrease;
    float form = (1.0 - 0.45 * hollow) * (1.0 - 0.6 * creaseDark) + rim * mix(0.15, 1.4, near) + creaseLit * 0.7;
    float fall = exp(-lv / 15.0) + exp(-lv / 46.0) * 0.12;
    totalEmissiveRadiance += ${v3(ember)} * uLeafLit * fall * form * 0.085 * vLeaf.w;
  }` : '',
    },
  });
  m.userData.uniforms = { uLeafLit: { value: 0 } };
  return m;
}

// The lock knob's grip: bronze cut with a fine diamond knurl, worked out per pixel round the yoke's x axis, so it
// fades to its average before its points get finer than a pixel and never shimmers.
const KNURL = { n: 104, pitch: 1.55, depth: 0.8, r: 26.5 };
function knurlMaterial(): THREE.MeshPhysicalMaterial {
  return metal({
    name: 'slKnurl', color: hex('bronze'), rough: 0.36, tarnish: 0.3, patina: PATINA,
    extra: {
      head: `
float kTri(float x){ return abs(fract(x) - 0.5) * 2.0; }
float kH(vec2 p){ return min(kTri(p.x + p.y), kTri(p.x - p.y)); }
float kSide(){ return step(${(KNURL.r - 1.2).toFixed(1)}, length(vObj.yz)) * (1.0 - step(0.45, abs(vObjN.x))); }
vec2 kAt(){ return vec2(atan(vObj.z, vObj.y) * ${(KNURL.n / (2 * Math.PI)).toFixed(4)}, abs(vObj.x) / ${KNURL.pitch.toFixed(3)}); }
float kFade(){ vec2 p = kAt(); return 1.0 - smoothstep(0.22, 0.5, max(length(fwidth(p)), 0.0)); }`,
      color: '{ float on = kSide() * kFade(); float h = kH(kAt()); diffuseColor.rgb *= mix(1.0, 0.25 + 0.95 * h, on); }',
      rough: '{ float on = kSide() * kFade(); roughnessFactor = mix(roughnessFactor, mix(0.6, 0.22, kH(kAt())), on); }',
      normal: `
  { float on = kSide() * kFade();
    if (on > 0.001) {
      vec2 p = kAt(); float e = 0.06;
      float du = (kH(p + vec2(e, 0.0)) - kH(p - vec2(e, 0.0))) / (2.0 * e);
      float da = (kH(p + vec2(0.0, e)) - kH(p - vec2(0.0, e))) / (2.0 * e);
      vec3 ax = normalize(vAxX);
      vec3 tg = normalize(cross(ax, normal));
      normal = normalize(normal - (du * tg * ${(KNURL.n * KNURL.depth / (2 * Math.PI * KNURL.r)).toFixed(4)} + da * ax * ${(KNURL.depth / KNURL.pitch).toFixed(4)} * sign(vObj.x)) * on);
    } }`,
    },
  });
}

export interface StudioModel {
  root: THREE.Group;
  yoke: THREE.Group;
  head: THREE.Group;
  inner: THREE.Group;
  lens: THREE.ShaderMaterial;
  glow: THREE.ShaderMaterial;
  housing: THREE.MeshPhysicalMaterial;
  leafIn: THREE.MeshPhysicalMaterial;
  wall: THREE.MeshLambertMaterial;
  glint: GlintUniforms;
  // In the head's frame: the back of the rear cap, the middle of the lens, the barn doors' tips.
  rear: THREE.Vector3;
  lensMiddle: THREE.Vector3;
  tips: THREE.Vector3[];
  // The mount's bounds in the root's frame, for framing before it is built.
  mountBox: THREE.Box3;
  // Turns the head so its axis is along d (in the root's frame), panning the yoke and tilting the head in it.
  aim(d: THREE.Vector3): void;
  // Builds the mount, once the head has its aim.
  buildMount(): void;
}

export async function buildStudioLight(): Promise<StudioModel> {
  const root = new THREE.Group();
  root.scale.setScalar(SL.SCALE);
  const yoke = new THREE.Group();
  const head = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.set(0, 0, -SL.TILT_Z);
  head.add(inner);
  root.add(yoke, head);
  for (const g of [yoke, head, inner]) g.matrixAutoUpdate = true;

  // ---- materials ------------------------------------------------------------------------------------------
  // The housing is enamelled steel, a warm near black that takes the light as shading; the struck flank flashes.
  const enamel = {
    head: 'uniform vec3 uStrike; uniform float uFlash; uniform vec3 uFlashCol;',
    emissive: 'float sd = length(vObj - uStrike); totalEmissiveRadiance += uFlashCol * uFlash * (exp(-sd * sd / 50.0) * 7.0 + exp(-sd * sd / 600.0) * 1.1 + exp(-sd * sd / 4000.0) * 0.22);',
  };
  const housing = dielectric('slHousing', 0x22170f, 0.46, { coat: 0.45, vary: 0.14, scale: 0.05, extra: enamel });
  housing.userData.uniforms = { uStrike: { value: new THREE.Vector3() }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(hex('hot')) } };
  // The drum's shell: the housing's enamel, with the glint's line.
  const drum = dielectric('slDrum', 0x22170f, 0.46, { coat: 0.45, vary: 0.14, scale: 0.05, extra: withGlint(GLINT, enamel) });
  capGlint(drum, BRONZE_TOP);
  const dark = dielectric('slDark', 0x1d140e, 0.5, { coat: 0.3, vary: 0.16, scale: 0.07 });
  // The wall plate is broad and flat, so at the room's level the yoke takes it would show the room as one bright sheet.
  const wallPlate = metal({ name: 'slWallPlate', color: 0x33200f, rough: 0.44, cast: 0.7, tarnish: 0.35, patina: PATINA });
  const yokeMat = metal({ name: 'slYoke', color: 0x3d2716, rough: 0.34, brush: 'y', cast: 0.4, tarnish: 0.3, patina: PATINA });
  const bronze = metal({ name: 'slBronze', color: hex('bronze'), rough: 0.33, brush: 'radial-z', tarnish: 0.3, patina: PATINA });
  capBright(bronze, BRONZE_TOP);
  const copper = metal({ name: 'slCopper', color: hex('copper'), rough: 0.44, tarnish: 0.25, patina: PATINA });
  const paint = dielectric('slPaint', 0x2c2017, 0.62, { vary: 0.08, scale: 0.05 });
  const leafOut = leafMaterial('slLeafOut', 0x17100b, 0.5, 0.25, false);
  const leafIn = leafMaterial('slLeafIn', 0x2c2017, 0.6, 0, true);
  const knurl = knurlMaterial();
  // The room's light lies along every rounded edge of the metal: the beads, the bar's edges, the leaves' rolled edges.
  for (const m of [bronze, copper, yokeMat, knurl]) m.envMapIntensity = EDGE_ROOM;
  housing.envMapIntensity = EDGE_ROOM * 0.8;
  drum.envMapIntensity = housing.envMapIntensity;
  const glint = glintUniforms();
  takeGlint(glint, drum);
  drum.userData.uniforms = { ...drum.userData.uniforms, ...housing.userData.uniforms };
  const glow = glowMaterial();
  const lens = lensMaterial();
  const plate = plateMaterial();

  await pause();
  // ---- the head ---------------------------------------------------------------------------------------------
  const hb = new Builder();
  const R = SL.R;
  // The drum in front of the louvres, with a rolled bead at each end.
  hb.add(turned([[R - 3, -44], [R + 2.5, -43], [R + 2.5, -38], [R, -36.5], [R, 55], [R + 2, 56.5], [R + 2, 59]], 128), drum);
  // The louvres: eight slanted rings that let the heat out and keep the light in, on four straps.
  const LOUV = { front: -46, pitch: 7.4, n: 8 };
  for (let k = 0; k < LOUV.n; k++) {
    const z = LOUV.front - k * LOUV.pitch;
    hb.add(turned([[R - 8, z - 6.7], [R - 8, z - 5.4], [R + 3.2, z], [R + 3.2, z - 1.1], [R - 8, z - 6.7]], 128), housing);
  }
  const louvRear = LOUV.front - (LOUV.n - 1) * LOUV.pitch - 6.7;
  hb.add(turned([[R - 4, louvRear - 4.5], [R + 3.6, louvRear - 4], [R + 4, louvRear - 1], [R + 3.6, louvRear + 0.5], [R - 4, louvRear + 0.8]], 128), housing);
  for (let k = 0; k < 4; k++) {
    const a = (45 + k * 90) * D2R;
    const len = LOUV.front - louvRear + 6;
    hb.add(rbox(9, len, 3.2, 1, 2), housing, onDrum(a, (LOUV.front + louvRear) / 2 - 1, R + 4.6));
    for (const z of [LOUV.front + 2, louvRear - 2]) hb.add(dome(2.2), copper, onDrum(a, z, R + 6.1));
  }
  // Inside, the lamp house: dark until the lamp catches, then lit through every gap.
  const core = new THREE.CylinderGeometry(R - 9, R - 9, LOUV.front - louvRear + 12, 96, 1, true);
  core.rotateX(Math.PI / 2);
  core.translate(0, 0, (LOUV.front + louvRear) / 2);
  const coreBack = new THREE.CircleGeometry(R + 1, 96);
  coreBack.rotateY(Math.PI);
  coreBack.translate(0, 0, louvRear - 5.2);

  // The rear cap, stood off the drum on four posts so a ring of light shows round it.
  const capZ = louvRear - 7.5;
  hb.add(turned([[0, SL.REAR], [20, SL.REAR], [23, SL.REAR + 2.5], [30, SL.REAR + 3.2], [78, capZ - 3.4], [89, capZ - 2], [R + 2.5, capZ - 0.6], [R + 3, capZ + 0.8], [R - 2, capZ + 1.6]], 128), housing);
  for (let k = 0; k < 4; k++) hb.add(new THREE.CylinderGeometry(3, 3, 6, 12).rotateX(Math.PI / 2), copper, onDrum((k * 90 + 20) * D2R, capZ + 2.5, R - 4).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
  for (let k = 0; k < 6; k++) hb.add(dome(2.4), copper, xf({ p: [Math.cos((k / 6) * Math.PI * 2) * 60, Math.sin((k / 6) * Math.PI * 2) * 60, capZ - 5.2], r: [Math.PI, 0, 0] }));
  // The focus knob on its spindle, knurled.
  hb.add(turned([[0, SL.REAR - 6], [5, SL.REAR - 6], [5, SL.REAR + 0.5]], 24), copper);
  hb.add(turned([[0, SL.REAR - 26], [10, SL.REAR - 26], [13, SL.REAR - 24], [13, SL.REAR - 9], [11, SL.REAR - 6.5], [5, SL.REAR - 6]], 72, { n: 30, depth: 1.1, from: 10.9 }), bronze);
  // The trunnions the yoke turns on.
  for (const s of [-1, 1]) {
    const t = new THREE.CylinderGeometry(19, 19, 14, 48); t.rotateZ(Math.PI / 2);
    hb.add(t, housing, xf({ p: [s * (R + 3), 0, SL.TILT_Z] }));
    const ring = new THREE.TorusGeometry(19, 1.6, 8, 48); ring.rotateY(Math.PI / 2);
    hb.add(ring, bronze, xf({ p: [s * (R + 9), 0, SL.TILT_Z] }));
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; hb.add(dome(2), copper, xf({ p: [s * (R + 10.1), Math.sin(a) * 13, SL.TILT_Z + Math.cos(a) * 13], r: [0, s * Math.PI / 2, 0] })); }
  }

  // The type plate, bent round the drum.
  {
    const pw = 46, ph = 23, rp = R + 0.6, a0 = 26 * D2R, z0 = 22;
    const g = new THREE.PlaneGeometry(pw, ph, 24, 2);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i), v = p.getY(i), a = a0 - u / rp;
      p.setXYZ(i, Math.cos(a) * rp, Math.sin(a) * rp, z0 - v);
    }
    g.computeVertexNormals();
    hb.add(g, plate);
    const back = slab(rounded(rrect(0, 0, pw + 2, ph + 2, 2)), [], -0.6, 0.2, 0.2, 1);
    const bp = back.getAttribute('position');
    for (let i = 0; i < bp.count; i++) { const u = bp.getX(i), v = bp.getY(i), w = bp.getZ(i), a = a0 - u / (R + w); bp.setXYZ(i, Math.cos(a) * (R + w), Math.sin(a) * (R + w), z0 - v); }
    back.computeVertexNormals();
    hb.add(back, bronze);
    for (const s of [-1, 1]) hb.add(dome(1.6), copper, onDrum(a0 - (s * (pw / 2 - 4)) / rp, z0, rp + 0.4));
  }

  await pause();
  // ---- the front: the lens door, its hinge and latch, the clips, the bezel and the lens -----------------------
  // The door: a bronze ring that swings open on a hinge to reach the lamp, its bezel sloping in to the lens.
  hb.add(turned([[R + 0.5, 58], [R + 3.5, 59.5], [R + 4, 63], [R + 3, 64.5], [R + 3, 78], [R + 1.5, 80.5], [R - 3, 81], [LENS.R + 6, 77], [LENS.R + 2, LENS.BASE + 2.5], [LENS.R + 1.6, LENS.BASE - 1]], 160), bronze);
  // The seam where the door meets the drum.
  hb.add(turned([[R - 1, 57.2], [R + 0.4, 57.4], [R + 0.4, 58.2], [R - 1, 58.4]], 128), paint);
  {
    const hinge = 205 * D2R, latch = 25 * D2R;
    hb.add(new THREE.CylinderGeometry(4.2, 4.2, 30, 20), bronze, onDrum(hinge, 66, R + 6));
    for (const z of [50.6, 81.4]) hb.add(new THREE.CylinderGeometry(2.4, 2.4, 1.6, 16), copper, onDrum(hinge, z, R + 6));
    hb.add(rbox(16, 22, 3, 1, 2), dark, onDrum(hinge, 46, R + 1.4));
    // The latch: a lever on a pivot, its tip over a keeper on the drum.
    hb.add(rbox(12, 22, 3.6, 1.6, 2), bronze, onDrum(latch, 70, R + 5.5));
    hb.add(rbox(14, 9, 3, 1.2, 2), dark, onDrum(latch, 51, R + 1.6));
    hb.add(dome(2.6), copper, onDrum(latch, 75, R + 7.4));
  }
  // The accessory clips that hold the barn doors' ring.
  for (let k = 0; k < 4; k++) {
    const a = (45 + k * 90) * D2R;
    hb.add(rbox(14, 20, 3, 1.2, 2), bronze, onDrum(a, 82, R + 5.5));
    hb.add(rbox(14, 4, 3.2, 1.2, 2), bronze, onDrum(a, 91, R + 3.2));
    hb.add(dome(1.8), copper, onDrum(a, 78, R + 7));
  }

  // The lens, and the dark ring of its seat.
  const lensMesh = new THREE.Mesh(lensGeometry(), lens);
  lensMesh.name = 'slLens';
  lensMesh.castShadow = true;
  lensMesh.receiveShadow = false;
  inner.add(lensMesh);
  hb.add(turned([[LENS.R + 1.8, LENS.BASE - 1], [LENS.R + 1.8, LENS.BASE + 1.2], [LENS.R + 0.4, LENS.BASE + 1.3], [LENS.R + 0.4, LENS.BASE + 0.15]], 160), paint);

  await pause();
  // ---- the barn doors: a ring that turns in the clips, a square frame and four hinged leaves --------------------
  const doors = hb;
  doors.add(turned([[R - 6, 84], [R + 6, 84], [R + 7.5, 86], [R + 7.5, 89], [R + 6, 90.5], [R - 6, 90.5]], 96, { n: 72, depth: 0.9, from: R + 7.4 }), bronze);
  const F = SL.FRAME;
  doors.add(slab(rounded(rrect(0, 0, F * 2, F * 2, 16)), [circle(0, 0, R - 4, 160)], SL.FRAME_Z - 3.2, SL.FRAME_Z, 0.7, 2), dark);
  for (const [x, y] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) doors.add(dome(2.4), copper, xf({ p: [x * (F - 10), y * (F - 10), SL.FRAME_Z] }));
  const tips: THREE.Vector3[] = [];
  const leaf = (side: number, len: number, tip: number, flare: number) => {
    const rot = new THREE.Matrix4().makeRotationZ(side + SL.DOORS_TURN * D2R);
    const half = F - 6;
    const a = flare * D2R;
    const U = new THREE.Vector3(1, 0, 0), Wd = new THREE.Vector3(0, Math.sin(a), Math.cos(a));
    const Nin = new THREE.Vector3().crossVectors(U, Wd);
    const hingeAt = new THREE.Vector3(0, F + 1.5, SL.FRAME_Z + 3);
    const base = new THREE.Matrix4().makeBasis(U, Wd, Nin).setPosition(hingeAt);
    const m = rot.clone().multiply(base);
    const outline: V[] = [[-half, 2, 2], [half, 2, 2], [tip, len, 5], [-tip, len, 5]];
    const T = 1.3;
    const sized = (g: THREE.BufferGeometry, on = 1) => {
      const n = g.getAttribute('position').count;
      const c = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) c.set([half, tip, len, on], i * 4);
      g.setAttribute('cell', new THREE.Float32BufferAttribute(c, 4));
      return g;
    };
    doors.add(sized(slab(rounded(outline), [], -T, 0, 0.35, 1)), leafOut, m);
    // A panel pressed up out of the sheet to stiffen it, its chamfers catching the light, and a crease down its middle.
    doors.add(sized(slab(rounded(inset(outline, 9)), [], -T - 1.1, -T + 0.2, 0.9, 2)), leafOut, m);
    {
      const crease: V[] = [[-2.6, 14, 0.4], [2.6, 14, 0.4], [1.6, len - 16, 0.4], [-1.6, len - 16, 0.4]];
      doors.add(sized(slab(rounded(crease), [], -T - 1.8, -T - 0.9, 0.5, 2)), leafOut, m);
    }
    const face = new THREE.ShapeGeometry(new THREE.Shape(rounded(outline.map(([x, y, r]) => [x * 0.985, y * 0.985 + 1.2, r] as V))));
    face.translate(0, 0, 0.06);
    doors.add(sized(face), leafIn, m);
    // The rolled edge, worn back to the bronze, round enough to hold a line of light.
    const pts = rounded(outline).map((p) => new THREE.Vector3(p.x, p.y, -T / 2));
    const free = pts.filter((p) => p.y > 4);
    const curve = new THREE.CatmullRomCurve3(free, false, 'catmullrom', 0.1);
    doors.add(new THREE.TubeGeometry(curve, 200, 1.9, 10, false), bronze, m);
    // The hinge: knuckles in turn from the leaf and the frame, on a copper pin.
    const n = 7, kl = (half * 2) / n;
    for (let k = 0; k < n; k++) {
      const c = new THREE.CylinderGeometry(3.4, 3.4, kl - 1, 16); c.rotateZ(Math.PI / 2);
      doors.add(c, k % 2 ? bronze : dark, rot.clone().multiply(xf({ p: [-half + kl * (k + 0.5), F + 1.5, SL.FRAME_Z + 3] })));
    }
    for (const s of [-1, 1]) { const c = new THREE.CylinderGeometry(1.9, 1.9, 2.2, 12); c.rotateZ(Math.PI / 2); doors.add(c, copper, rot.clone().multiply(xf({ p: [s * (half + 1), F + 1.5, SL.FRAME_Z + 3] }))); }
    // A tab to set it by.
    doors.add(sized(rbox(18, 12, 1.6, 1.2, 2), 0), leafOut, m.clone().multiply(xf({ p: [tip * 0.62, len - 2, -T / 2] })));
    for (const s of [-1, 1]) tips.push(new THREE.Vector3(s * tip, len, 0).applyMatrix4(m));
  };
  leaf(0, SL.BIG.len, SL.BIG.tip, SL.BIG.flare);
  leaf(Math.PI, SL.BIG.len, SL.BIG.tip, SL.BIG.flare);
  leaf(Math.PI / 2, SL.SMALL.len, SL.SMALL.tip, SL.SMALL.flare);
  leaf(-Math.PI / 2, SL.SMALL.len, SL.SMALL.tip, SL.SMALL.flare);

  hb.build(inner, 'head');
  const glowMesh = new THREE.Mesh(mergeGeometries([core.toNonIndexed(), coreBack.toNonIndexed()]), glow);
  glowMesh.name = 'slGlow';
  inner.add(glowMesh);

  await pause();
  // ---- the yoke: a U of flat bar, a toothed disc and a knurled lock knob at each side, the spigot ---------------
  const yb = new Builder();
  {
    const Wy = SL.YOKE_W, Hy = SL.YOKE_H, T = SL.BAR_T, rc = 28;
    const path: THREE.Vector2[] = [];
    const push = (x: number, y: number) => path.push(new THREE.Vector2(x, y));
    for (let i = 0; i <= 6; i++) push(-Wy, (i / 6) * (Hy - rc));
    for (let i = 1; i <= 12; i++) { const a = Math.PI - (i / 12) * (Math.PI / 2); push(-Wy + rc + Math.cos(a) * rc, Hy - rc + Math.sin(a) * rc); }
    for (let i = 1; i <= 8; i++) push(-Wy + rc + (i / 8) * (2 * (Wy - rc)), Hy);
    for (let i = 1; i <= 12; i++) { const a = Math.PI / 2 - (i / 12) * (Math.PI / 2); push(Wy - rc + Math.cos(a) * rc, Hy - rc + Math.sin(a) * rc); }
    for (let i = 1; i <= 6; i++) push(Wy, Hy - rc - (i / 6) * (Hy - rc));
    const nrm = (i: number) => { const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)]; const d = b.clone().sub(a).normalize(); return new THREE.Vector2(d.y, -d.x); };
    const outer = path.map((p, i) => p.clone().addScaledVector(nrm(i), -T / 2));
    const innerL = path.map((p, i) => p.clone().addScaledVector(nrm(i), T / 2)).reverse();
    const shape = new THREE.Shape([...outer, ...innerL]);
    const bar = new THREE.ExtrudeGeometry(shape, { depth: SL.BAR_W - 2, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelOffset: -0.2, bevelSegments: 2, curveSegments: 4 });
    bar.translate(0, 0, -(SL.BAR_W - 2) / 2);
    yb.add(toCreasedNormals(bar, 35 * D2R), yokeMat);
    for (const s of [-1, 1]) {
      // The arm's end, round round the pivot.
      const boss = new THREE.CylinderGeometry(SL.BAR_W / 2 + 4, SL.BAR_W / 2 + 4, T, 48); boss.rotateZ(Math.PI / 2);
      yb.add(boss, yokeMat, xf({ p: [s * Wy, 0, 0] }));
      // The toothed disc between the arm and the trunnion.
      const disc = turned([[0, 0], [21, 0], [22.5, 1.2], [22.5, 4.8], [21, 6], [12, 6]], 0, { n: 30, depth: 1.8, from: 20.9 });
      disc.rotateY(Math.PI / 2);
      if (s < 0) disc.rotateY(Math.PI);
      yb.add(disc, dark, xf({ p: [s * (Wy - T / 2 - 6.4), 0, 0] }));
      // The lock knob: washer, knurled grip, a domed cap.
      const wash = turned([[0, 0], [15, 0], [15, 2.2], [0, 2.2]], 48);
      const grip = turned([[8, 2.2], [24, 2.2], [KNURL.r, 4.6], [KNURL.r, 14], [24, 16.4], [17, 16.4]], 160);
      const cap = turned([[17.5, 16], [17.5, 17.6], [15, 19.6], [9, 21.4], [0, 22]], 64);
      const stud = turned([[0, -2], [5, -2], [5, 0]], 16);
      const turn = new THREE.Matrix4().makeRotationY(s * Math.PI / 2);
      const place = xf({ p: [s * (Wy + T / 2), 0, 0] }).multiply(turn);
      yb.add(wash, copper, place);
      yb.add(grip, knurl, place);
      yb.add(cap, copper, place);
      yb.add(stud, copper, place);
    }
    // The spigot plate bolted to the crossbar, and the spigot standing up from it.
    yb.add(rbox(58, 9, SL.BAR_W, 2, 2), yokeMat, xf({ p: [0, Hy + T / 2 + 4.5, 0] }));
    for (const s of [-1, 1]) { const sc = screw(3.2); const m = xf({ p: [s * 20, Hy + T / 2 + 9, 0], r: [-Math.PI / 2, 0, s * 0.4] }); yb.add(sc.head, copper, m); yb.add(sc.slot, dark, m); }
    yb.add(turned([[0, 0], [15, 0], [15, 30], [13.4, 31.5], [13.4, 34], [15, 35.5], [15, 50], [13, 52], [0, 52]], 48), yokeMat, xf({ p: [0, Hy + T / 2 + 9, 0], r: [-Math.PI / 2, 0, 0] }));
  }
  yb.build(yoke, 'yoke');

  await pause();
  // ---- the mount: a plate screwed to the wall, an arm out of it, a receiver the spigot drops into --------------
  const mb = new Builder();
  const [px, py, pz] = SL.PIVOT;
  const topY = py + SL.YOKE_H + SL.BAR_T / 2 + 9;
  const recY = topY + 22;
  // How far the plate's centre stands over the receiver's foot.
  const PLATE_UP = 18;
  {
    const rec = turned([[0, 0], [21, 0], [23, 2], [23, 40], [21, 42], [0, 42]], 64);
    mb.add(rec, yokeMat, xf({ p: [px, recY - 4, pz], r: [-Math.PI / 2, 0, 0] }));
    mb.add(new THREE.TorusGeometry(22.6, 1.4, 8, 48).rotateX(Math.PI / 2), bronze, xf({ p: [px, recY + 7, pz] }));
    mb.add(new THREE.TorusGeometry(22.6, 1.4, 8, 48).rotateX(Math.PI / 2), bronze, xf({ p: [px, recY + 30, pz] }));
    // The lock screw, out of the receiver's side, with a T handle.
    const sd = new THREE.Vector3(0.62, 0, 0.78).normalize();
    const s0 = new THREE.Vector3(px, recY + 18, pz).addScaledVector(sd, 20), s1 = s0.clone().addScaledVector(sd, 20);
    mb.add(rod(s0, s1, 4.2, 16), copper);
    mb.add(rod(s0.clone().addScaledVector(sd, -2), s0.clone().addScaledVector(sd, 4), 8, 24), yokeMat);
    const side = new THREE.Vector3(0, 1, 0);
    mb.add(rod(s1.clone().addScaledVector(side, -17), s1.clone().addScaledVector(side, 17), 4.4, 16), bronze);
    for (const k of [-1, 1]) mb.add(new THREE.SphereGeometry(6, 16, 10), bronze, xf({ p: s1.clone().addScaledVector(side, k * 18).toArray() as [number, number, number] }));
    // The arm: square bar from the plate down and out to the receiver's back.
    const plateY = recY + PLATE_UP;
    const a0 = new THREE.Vector3(px, plateY - 4, 10), a1 = new THREE.Vector3(px, recY + 16, pz - 18);
    const dir = a1.clone().sub(a0);
    const len = dir.length();
    const armG = rbox(24, len, 24, 3, 2);
    armG.translate(0, len / 2, 0);
    armG.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
    armG.translate(a0.x, a0.y, a0.z);
    mb.add(armG, yokeMat);
    mb.add(rbox(30, 30, 10, 3, 2), yokeMat, xf({ p: [px, recY + 16, pz - 22] }));
    // A gusset under the arm.
    const gus = new THREE.Shape([new THREE.Vector2(10, plateY - 18), new THREE.Vector2(10, plateY - 62), new THREE.Vector2(pz - 40, recY + 8)]);
    const gg = new THREE.ExtrudeGeometry(gus, { depth: 6, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 1 });
    gg.rotateY(-Math.PI / 2);
    gg.translate(px + 3, 0, 0);
    mb.add(gg, yokeMat);
    // The plate on the wall, its flange, four screws seen face on.
    mb.add(slab(rounded(rrect(px, plateY - 20, 104, 92, 10)), [], 0, 9, 1.6, 2), wallPlate);
    mb.add(turned([[0, 9], [30, 9], [30, 13], [27, 16], [0, 16]], 48), wallPlate, xf({ p: [px, plateY - 6, 0] }));
    const sc = screw(6);
    for (const [x, y] of [[-36, 12], [36, 12], [-36, -52], [36, -52]]) {
      const m = xf({ p: [px + x, plateY + y, 9], r: [0, 0, (x * 3 + y) * D2R] });
      mb.add(sc.head, copper, m); mb.add(sc.slot, dark, m);
      mb.add(new THREE.TorusGeometry(6.8, 0.9, 8, 32), bronze, xf({ p: [px + x, plateY + y, 9.2] }));
    }
  }

  // ---- the wall: it takes the cursor's light and the light's shadow, and fades long before the canvas's edge ----
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x2a1e15 });
  wallMat.name = 'slWall';
  wallMat.blending = THREE.CustomBlending;
  wallMat.blendEquation = THREE.AddEquation;
  wallMat.blendSrc = THREE.OneFactor;
  wallMat.blendDst = THREE.OneFactor;
  wallMat.blendSrcAlpha = THREE.ZeroFactor;
  wallMat.blendDstAlpha = THREE.OneFactor;
  wallMat.userData.uniforms = { uFadeC: { value: new THREE.Vector2() }, uFadeR: { value: new THREE.Vector2(200, 300) } };
  wallMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, wallMat.userData.uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWallW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWallW = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWallW;\nuniform vec2 uFadeC, uFadeR;')
      .replace('vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;', 'float wd = length(vWallW.xy - uFadeC);\nfloat wallK = exp(-wd * wd / (2.0 * uFadeR.x * uFadeR.x)) * (1.0 - smoothstep(uFadeR.y * 0.7, uFadeR.y, wd));\nvec3 outgoingLight = reflectedLight.directDiffuse * wallK;');
  };
  wallMat.customProgramCacheKey = () => 'slWall';
  const wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), wallMat);
  wallMesh.name = 'slWall';
  wallMesh.receiveShadow = true;
  wallMesh.castShadow = false;
  wallMesh.userData.noWire = true;
  wallMesh.userData.noAO = true;
  root.add(wallMesh);

  // ---- aiming --------------------------------------------------------------------------------
  const pivot = new THREE.Vector3(...SL.PIVOT);
  const up = new THREE.Vector3(0, 1, 0);
  const aim = (d: THREE.Vector3) => {
    const z = d.clone().normalize();
    const y = up.clone().addScaledVector(z, -up.dot(z)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z).normalize();
    head.matrix.makeBasis(x, y, z).setPosition(pivot);
    head.matrix.decompose(head.position, head.quaternion, head.scale);
    const zy = new THREE.Vector3().crossVectors(x, up).normalize();
    yoke.matrix.makeBasis(x, up, zy).setPosition(pivot);
    yoke.matrix.decompose(yoke.position, yoke.quaternion, yoke.scale);
    root.updateMatrixWorld(true);
  };

  // The mount is built once the head has its aim: it never moves.
  let built = false;
  const buildMount = () => {
    if (built) return;
    built = true;
    mb.build(root, 'mount');
  };

  const lensMiddle = LENS_MIDDLE.clone();
  const rear = new THREE.Vector3(0, 0, SL.REAR);
  const plateTop = recY + PLATE_UP + 26;
  // The light is framed on the bracket's own plate, not on the box's end of it: the anchors were set on that framing.
  const mountBox = new THREE.Box3(new THREE.Vector3(px - 52, recY - 6, 0), new THREE.Vector3(px + 52, plateTop, pz + 44));
  return { root, yoke, head, inner, lens, glow, housing, leafIn, wall: wallMat, glint, rear, lensMiddle, tips, mountBox, aim, buildMount };
}
