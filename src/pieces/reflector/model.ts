import * as THREE from 'three';
import { Builder, pause, lathe, rbox, xf, seeded } from '../../world/build';
import { circle, rounded, rrect, screw, slab, type V } from '../../world/shape';
import { dielectric, lin, metal, type Chunks } from '../../world/surface';
import { hex } from '../../config/palette';
import { type GlintUniforms, glintUniforms, takeGlint, withGlint } from '../../world/glint';

// The reflector, in millimetres under a root scaled by 0.001. The page's ground is the wall, the plane z = 0, and the
// visitor looks straight at it from +z. The dish's face looks up and to the right on the screen, 43 degrees above
// level, and is turned toward the visitor by 25 degrees. The middle of its face, where the stream strikes, is D.

const D2R = Math.PI / 180;
export const RF = {
  SCALE: 0.001,
  // The middle of the dish's face, out from the wall.
  D: [0, 0, 330] as const,
  // The line square to the face: its angle on the screen above level, and how far it is turned toward the visitor.
  UP: 43,
  TOWARD: 25,
  // The face's radius to the rim, its depth there, the rolled bead and the sheet.
  FACE: 202,
  DEPTH: 38,
  BEAD: 6.2,
  SHEET: 1.4,
  // Where the arm's two bars meet, and where the arm meets the socket on the wall.
  KNUCKLE: [-262, -112, 196] as const,
  PIVOT: [-178, -282, 82] as const,
  // The plate on the wall.
  PLATE: { x: -178, y: -300, w: 92, h: 142, r: 12, t: 8 } as const,
  // How much of the host's height the dish's long way across takes, and so how tall a slice of the world the host frames.
  SPAN: 0.4,
} as const;

export const FRAME_H = (2 * (RF.FACE + RF.BEAD)) / RF.SPAN;

export function dishAxis(): THREE.Vector3 {
  const a = RF.UP * D2R, t = RF.TOWARD * D2R;
  return new THREE.Vector3(Math.cos(t) * Math.cos(a), Math.cos(t) * Math.sin(a), Math.sin(t));
}

// The face's height over its middle at radius r: a shallow spun bowl, a touch flatter at the middle than a sphere.
const bowl = (r: number) => RF.DEPTH * (0.82 * (r / RF.FACE) ** 2 + 0.18 * (r / RF.FACE) ** 4);

export interface FaceUniforms {
  uOn: { value: number };
  uFlash: { value: number };
  uSpill: { value: number };
  uFan: { value: THREE.Vector2 };
  uBend: { value: THREE.Matrix3 };
  uAxisV: { value: THREE.Vector3 };
  uGoal: { value: THREE.Vector3 };
  uCurve: { value: number };
  uLampD: { value: THREE.Vector3 };
  uView: { value: THREE.Vector2 };
}

export interface ReflectorModel {
  root: THREE.Group;
  dish: THREE.Group;
  // What answers the strike: the upper bar about the knuckle, the chain from its foot, and the points they turn about.
  upper: THREE.Group;
  chain: THREE.Group;
  knock: { ball: THREE.Vector3; knuckle: THREE.Vector3; axis: THREE.Vector3; chainTop: THREE.Vector3; chainFoot: THREE.Vector3 };
  face: FaceUniforms;
  wall: THREE.Mesh;
  // Where the cursor's light on the wall is brightest, from the wall's middle: the page's side of the object nearer the lamp.
  wallC: { value: THREE.Vector2 };
  centre: THREE.Vector3;
  // The tube's glint, and the tube's ends in the root's millimetres.
  glint: GlintUniforms;
  tube: { a: THREE.Vector3; b: THREE.Vector3 };
  tris: number;
}

const PATINA: [number, number, number] = [0.7, 0.58, 0.5];
// The cursor's glint on the arm's tube only (../../world/glint.ts): a tight copper line along the tube, as long as the
// stretch of it that faces the glint's lamp, which the piece sets close to the tube and moves along it with the pointer
// (./index.ts, TUBE). Every other part is lit as it was. The knuckle had one too, a fleck at the page's size.
const ALONG = new THREE.Vector3(...RF.PIVOT).sub(new THREE.Vector3(...RF.KNUCKLE)).normalize();
const GLINT = { tint: 'copper', sharp: 45, k: 1, pale: 0.25, turned: [ALONG.x, ALONG.y, ALONG.z], along: 0.24, unshadowed: true } as const;

// The copper of the face: spun rings round the middle that catch a line of light, a face beaten all over with small
// shallow hollows that scatter it, darker down in the hollows, and the stream's light held in a pool that runs out
// along the rings. The face's own space has its axis along y and its middle at the origin.
function faceChunks(u: FaceUniforms): Chunks {
  const pale = lin(hex('pale')), hot = lin(hex('hot')), flame = lin(hex('flame')), ember = lin(hex('ember'));
  return {
    vhead: 'varying vec3 vAxZ;',
    vert: 'vAxZ = normalize(mat3(modelViewMatrix) * vec3(0.0, 0.0, 1.0));',
    head: /* glsl */ `
varying vec3 vAxZ;
uniform float uOn, uFlash, uSpill;
uniform vec2 uFan;
uniform vec2 uView;
vec3 fToView(vec3 v){ return v.x * vAxX + v.y * vAxY + v.z * vAxZ; }
vec2 fHash(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
// The spinning rings: tool marks round the middle, as a height along the radius.
float fRings(float r, float px){
  float a1 = 1.0 - smoothstep(0.35, 0.8, px / 1.15);
  float a2 = 1.0 - smoothstep(0.35, 0.8, px / 3.1);
  float a3 = 1.0 - smoothstep(0.35, 0.8, px / 9.0);
  return sin(r * 5.46 + wNoise(vec3(r * 0.21, 1.3, 0.0)) * 5.0) * 0.5 * a1
       + (wNoise(vec3(r * 0.95, 7.1, 0.0)) - 0.5) * 1.1 * a2
       + (wNoise(vec3(r * 0.13, 2.7, 0.0)) - 0.5) * 1.6 * a3;
}
// The pebbled face: low round bumps pressed into the copper, each as its offset from the bump's middle and its radius.
vec3 fPebble(vec2 p){
  float C = 9.0;
  vec2 g = floor(p / C);
  vec3 best = vec3(0.0, 0.0, 1e9);
  float rad = C;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = g + vec2(float(i), float(j));
    vec2 h = fHash(c);
    vec2 f = (c + 0.15 + 0.7 * h) * C;
    vec2 d = p - f;
    float dd = dot(d, d);
    if (dd < best.z) { best = vec3(d, dd); rad = C * (0.34 + 0.16 * fract(h.x * 7.13 + h.y)); }
  }
  return vec3(best.xy, rad);
}
// How much of the pebbling a pixel can hold: none once a bump is under three pixels across.
float fPebK(float px, float rad){ return 1.0 - smoothstep(0.22, 0.5, px / rad); }
float fPx(){ return max(sqrt(length(dFdx(vObj)) * length(dFdy(vObj))), 1e-4); }
`,
    color: /* glsl */ `
  { float r = length(vObj.xz); float px = fPx();
    vec3 b = fPebble(vObj.xz);
    float kd = fPebK(px, b.z);
    float q = dot(b.xy, b.xy) / (b.z * b.z);
    diffuseColor.rgb *= 1.0 - 0.2 * smoothstep(0.7, 1.15, q) * kd;
    float ringT = fRings(r, px);
    diffuseColor.rgb *= 1.0 + 0.11 * ringT;
    // The rim's foot and the chuck mark at the middle sit a little darker.
    diffuseColor.rgb *= 1.0 - 0.25 * smoothstep(${(RF.FACE - 14).toFixed(1)}, ${(RF.FACE - 1).toFixed(1)}, r);
    diffuseColor.rgb *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.6, abs(r - 10.0)));
  }`,
    rough: /* glsl */ `
  { float r = length(vObj.xz); float px = fPx(); vec3 b = fPebble(vObj.xz);
    float kd = fPebK(px, b.z);
    roughnessFactor = clamp(roughnessFactor + 0.08 * (1.0 - kd) - 0.05 * fRings(r, px) - 0.14 * (1.0 - smoothstep(8.5, 10.0, r)), 0.06, 1.0); }`,
    normal: /* glsl */ `
  { float r = max(length(vObj.xz), 1e-3); float px = fPx();
    vec3 radial = vec3(vObj.x / r, 0.0, vObj.z / r);
    float e = 0.2;
    float dh = (fRings(r + e, px) - fRings(r - e, px)) / (2.0 * e);
    vec3 b = fPebble(vObj.xz);
    float kd = fPebK(px, b.z);
    float q = dot(b.xy, b.xy) / (b.z * b.z);
    vec2 tilt = b.xy / b.z * (1.0 - smoothstep(0.0, 1.0, q)) * 0.55 * kd;
    vec3 nObj = normalize(vObjN);
    vec3 pert = -radial * dh * 0.05 * (1.0 - step(r, 10.5)) + vec3(tilt.x, 0.0, tilt.y);
    pert -= nObj * dot(pert, nObj);
    normal = normalize(normal + fToView(pert));
  }`,
    emissive: /* glsl */ `
  { float r = length(vObj.xz); float px = fPx();
    vec2 dir = vObj.xz / max(r, 1e-3);
    // The stream's light on spun metal is a streak across the rings: two fans opposite each other through the middle,
    // along uFan, never a ring. They glitter where the pebbling catches them and are broken along their length.
    vec3 b = fPebble(vObj.xz);
    float kd = fPebK(px, b.z);
    float q = dot(b.xy, b.xy) / (b.z * b.z);
    float glint = 1.0 - 0.55 * kd + 0.55 * kd * (0.3 + 1.5 * fract(b.z * 7.31)) * (1.0 - smoothstep(0.15, 1.05, q)) * 1.8;
    float grain = 0.55 + 0.9 * wNoise(vec3(vObj.xz * 0.06, 5.0));
    float fan = pow(abs(dot(dir, uFan)), mix(42.0, 9.0, uSpill));
    float fans = fan * smoothstep(4.0, 30.0, r) * exp(-pow(r / mix(150.0, 240.0, uSpill), 2.0)) * glint * grain;
    float warm = exp(-pow(r / 95.0, 2.0)) * 0.1;
    float pool = (fans * 0.85 + warm) * uOn;
    float strike = fans * uFlash * 2.4;
    float lip = exp(-pow((r - ${(RF.FACE - 3).toFixed(1)}) / 3.2, 2.0)) * (0.05 + 0.5 * pow(abs(dot(dir, uFan)), 10.0)) * (uOn * 0.5 + uFlash);
    float k = pool + strike + lip;
    vec3 c = mix(${ember}, ${flame}, smoothstep(0.0, 0.2, k));
    c = mix(c, ${hot}, smoothstep(0.2, 0.75, k));
    c = mix(c, ${pale}, smoothstep(1.1, 1.7, k));
    totalEmissiveRadiance += c * min(k, 1.1) * 0.68;
  }`,
  };
}

// Makes the cursor's light answer across the whole face. The dish looks mostly away from the visitor, so a light on
// their side of the screen would only graze it: for the direct lights alone, the face's normals are turned toward the
// visitor (uGoal in place of the axis uAxisV), and the bowl's curve deepened by uCurve, keeping every ring and hollow,
// so the light's highlight is a place on the face that runs right across it as the cursor crosses the screen. Point
// lights are left out of it: the stream's light sits close in front of the bowl and would light all of it at once.
function bendDirect(m: THREE.MeshPhysicalMaterial, u: FaceUniforms): void {
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base.call(m, sh, r);
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform mat3 uBend; uniform vec3 uAxisV, uGoal; uniform float uCurve;')
      .replace('#include <lights_fragment_begin>', /* glsl */ `
  vec3 nKeep = normal;
  normal = normalize(uGoal + (normal - uAxisV * dot(normal, uAxisV)) * uCurve);
  #ifdef USE_ANISOTROPY
    vec3 aTKeep = material.anisotropyT, aBKeep = material.anisotropyB;
    material.anisotropyT = uBend * aTKeep; material.anisotropyB = uBend * aBKeep;
    float aKeep = material.alphaT;
    material.alphaT = mix(pow2(material.roughness), aKeep, smoothstep(14.0, 60.0, length(vObj.xz)));
  #endif
  ${THREE.ShaderChunk.lights_fragment_begin.replace('#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )', '#if 0')}
  normal = nKeep; geometryNormal = nKeep;
  #ifdef USE_ANISOTROPY
    material.anisotropyT = aTKeep; material.anisotropyB = aBKeep;
    material.alphaT = aKeep;
  #endif`);
  };
}

// A cylinder with straight knurling round its side, standing on y.
function knurled(r: number, h: number, ridges: number, depth = 0.07): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, h, ridges * 4, 1);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z);
    if (rr < r * 0.6) continue;
    const a = Math.atan2(z, x);
    const k = 1 - depth * (0.5 + 0.5 * Math.cos(a * ridges));
    p.setX(i, (x / rr) * r * k); p.setZ(i, (z / rr) * r * k);
  }
  g.computeVertexNormals();
  return g;
}

// A disc with a crown of teeth on its top face, standing on y: one half of a toothed joint.
function toothed(r: number, h: number, teeth: number, tooth: number, turn = 0): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, h, teeth * 2, 1);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < h / 2 - 1e-3) continue;
    const x = p.getX(i), z = p.getZ(i);
    if (Math.hypot(x, z) < r * 0.5) continue;
    const a = Math.atan2(z, x) + turn;
    const k = Math.round((a / (Math.PI * 2)) * teeth * 2);
    p.setY(i, h / 2 + (k % 2 === 0 ? tooth : -tooth) * 0.5);
  }
  // The teeth get flat faces, so each catches a line of light; the round side keeps its smooth normals.
  const out = g.toNonIndexed();
  out.computeVertexNormals();
  const q = out.getAttribute('position'), nn = out.getAttribute('normal');
  for (let i = 0; i < q.count; i++) {
    if (Math.abs(nn.getY(i)) > 0.3) continue;
    const x = q.getX(i), z = q.getZ(i), l = Math.hypot(x, z) || 1;
    nn.setXYZ(i, x / l, 0, z / l);
  }
  return out;
}

// A flat bar's outline along y from y0 to y1, half w wide, with round ends of n steps each.
function stadium(y0: number, y1: number, w: number, n: number): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI; out.push(new THREE.Vector2(Math.cos(a) * w, y0 + Math.sin(a) * w)); }
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; out.push(new THREE.Vector2(Math.cos(a) * w, y1 + Math.sin(a) * w)); }
  return out;
}

// A matrix that stands a part made along y on the line from a toward b, at a, with its x axis toward side.
function along(a: THREE.Vector3, b: THREE.Vector3, side?: THREE.Vector3): THREE.Matrix4 {
  const y = b.clone().sub(a).normalize();
  let x = side ? side.clone().sub(y.clone().multiplyScalar(side.dot(y))) : new THREE.Vector3(1, 0, 0).cross(y);
  if (x.lengthSq() < 1e-6) x = new THREE.Vector3(0, 0, 1).cross(y);
  x.normalize();
  const z = x.clone().cross(y).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(a);
}

// A matrix whose y axis is w, at p.
const facing = (p: THREE.Vector3, w: THREE.Vector3, side?: THREE.Vector3) => along(p, p.clone().add(w), side);

// The made up mark on the maker's plate, cut into the copper and filled dark.
function makersMark(): THREE.MeshPhysicalMaterial {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 384;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeRect(26, 26, c.width - 52, c.height - 52);
  g.font = '700 138px "Sora Variable", "Sora", system-ui, sans-serif';
  (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '18px';
  g.fillText('RF·420', c.width / 2, 158);
  g.font = '600 62px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';
  (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '12px';
  g.fillText('MK II · 0731', c.width / 2, 286);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
  const m = new THREE.MeshPhysicalMaterial({ color: 0x140b06, roughness: 0.6, alphaMap: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  m.name = 'rfMark';
  return m;
}

// The wall behind takes the reflector's shadow close to it, a little, and nothing else: it adds no light of its own
// and only darkens the page where the cursor's light is blocked, fading out well inside the host.
function wallMaterial(centre: { value: THREE.Vector2 }, reach: [number, number]): THREE.ShadowMaterial {
  const m = new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.6, depthWrite: false });
  m.name = 'rfWall';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWallC = centre;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWall;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWall = position.xy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWall; uniform vec2 uWallC;').replace('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );', `
  vec2 q = (vWall - uWallC) / vec2(${reach[0].toFixed(1)}, ${reach[1].toFixed(1)});
  float d2 = dot(q, q);
  gl_FragColor = vec4(color, opacity * (1.0 - getShadowMask()) * exp(-2.2 * d2) * (1.0 - smoothstep(0.6, 1.0, sqrt(d2))));`);
  };
  m.customProgramCacheKey = () => 'rfWall';
  return m;
}

// The rolled rim's highlight: a crisp line along the crest of the bead, lit round the part of its circle that faces the
// cursor's light (uLampD, the light's direction from the dish in the dish's own space), so it moves as a bead's does.
function rimChunks(): Chunks {
  const glow = lin(hex('copper-light')), hot = lin(hex('hot'));
  return {
    vhead: 'varying vec3 vAxZ;',
    vert: 'vAxZ = normalize(mat3(modelViewMatrix) * vec3(0.0, 0.0, 1.0));',
    head: 'uniform vec3 uLampD; varying vec3 vAxZ;',
    emissive: /* glsl */ `
  { vec2 dir = normalize(vObj.xz + 1e-4);
    vec2 toward = normalize(uLampD.xz + 1e-4);
    float arc = pow(0.5 + 0.5 * dot(dir, toward), 9.0) * smoothstep(0.0, 0.35, length(uLampD.xz));
    vec3 V = normalize(vViewPosition);
    vec3 nObj = normalize(vObjN);
    vec3 nV = normalize(nObj.x * vAxX + nObj.y * vAxY + nObj.z * vAxZ);
    vec3 t = normalize(-dir.y * vAxX + dir.x * vAxZ);
    vec3 Vp = normalize(V - t * dot(V, t));
    float crest = pow(clamp(dot(nV, Vp), 0.0, 1.0), 40.0);
    totalEmissiveRadiance += mix(${glow}, ${hot}, crest) * crest * arc * 2.6; }`,
  };
}

// Holds a metal's brightest light under the glow's threshold, keeping its hue, so a highlight stays a crisp line or point
// and never blooms into a soft spot.
function capBright(m: THREE.MeshPhysicalMaterial, top: number): void {
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight *= min(1.0, ${top.toFixed(2)} / max(1e-4, max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b))));\n#include <opaque_fragment>`);
  };
}

// The arm's metals: a rim of the room's light round every outline, so the arm reads against the page's dark ground
// with the cursor's light far away, and, where worn, bronze showing through on edges and the lips of slots.
function armChunks(rim: number, wear: boolean): Chunks {
  const worn = lin(hex('bronze')), glow = lin(hex('copper-light'));
  return {
    vhead: wear ? 'attribute vec4 cell; varying float vWear;' : '',
    vert: wear ? 'vWear = cell.x;' : '',
    head: wear ? 'varying float vWear;' : '',
    color: wear ? /* glsl */ `
  { float cv = length(fwidth(vObjN)) / max(length(fwidth(vObj)), 1e-4);
    float w = max(smoothstep(0.1, 0.35, cv) * 0.6, smoothstep(0.08, 0.7, vWear)) * (0.6 + 0.4 * wNoise(vObj * 0.35));
    diffuseColor.rgb = mix(diffuseColor.rgb, ${worn} * 1.9, w); }` : '',
    rough: wear ? /* glsl */ `
  { float cv = length(fwidth(vObjN)) / max(length(fwidth(vObj)), 1e-4);
    roughnessFactor = mix(roughnessFactor, 0.2, max(smoothstep(0.1, 0.35, cv) * 0.6, smoothstep(0.08, 0.7, vWear))); }` : '',
    emissive: /* glsl */ `
  { vec3 V = normalize(vViewPosition);
    float f = pow(1.0 - clamp(dot(normal, V), 0.0, 1.0), 3.0);
    vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
    totalEmissiveRadiance += ${glow} * f * (0.35 + 0.65 * smoothstep(-0.3, 0.7, dot(normal, up))) * ${rim.toFixed(3)}; }`,
  };
}

export async function buildReflector(): Promise<ReflectorModel> {
  const root = new THREE.Group();
  root.scale.setScalar(RF.SCALE);
  const n = dishAxis();
  const D = new THREE.Vector3(...RF.D);

  await pause();
  // ---- materials ---------------------------------------------------------------------------------------------
  const face: FaceUniforms = { uOn: { value: 0 }, uFlash: { value: 0 }, uSpill: { value: 0 }, uFan: { value: new THREE.Vector2(1, 0) }, uBend: { value: new THREE.Matrix3() }, uAxisV: { value: new THREE.Vector3(0, 0, 1) }, uGoal: { value: new THREE.Vector3(0, 0, 1) }, uCurve: { value: 1 }, uLampD: { value: new THREE.Vector3(0, 1, 0) }, uView: { value: new THREE.Vector2(0, 1) } };
  const copperFace = metal({ name: 'rfFace', color: hex('copper'), rough: 0.2, tarnish: 0.08, patina: PATINA, aniso: 0.3, anisoRot: Math.PI / 2, extra: faceChunks(face) });
  copperFace.userData.uniforms = face;
  copperFace.envMapIntensity = 0.42;
  bendDirect(copperFace, face);
  const copperRim = metal({ name: 'rfRim', color: hex('copper'), rough: 0.11, tarnish: 0.1, patina: PATINA, aniso: 0.7, anisoRot: 0, extra: rimChunks() });
  copperRim.userData.uniforms = { uLampD: face.uLampD };
  copperRim.envMapIntensity = 0.35;
  capBright(copperRim, 1.25);
  const copperPlate = metal({ name: 'rfCopper', color: hex('copper'), rough: 0.34, brush: 'x', tarnish: 0.3, patina: PATINA });
  const back = metal({ name: 'rfBack', color: 0x22170f, rough: 0.5, cast: 0.6, tarnish: 0.2, patina: PATINA, extra: armChunks(0.1, false) });
  const dark = metal({ name: 'rfDark', color: 0x2c1e14, rough: 0.4, brush: 'y', tarnish: 0.2, patina: PATINA, extra: armChunks(0.16, true) });
  const bronze = metal({ name: 'rfBronze', color: hex('bronze'), rough: 0.3, brush: 'radial-z', tarnish: 0.25, patina: PATINA, extra: armChunks(0.2, false) });
  const bronzeCast = metal({ name: 'rfBronzeCast', color: 0x6e4524, rough: 0.42, cast: 0.8, tarnish: 0.35, patina: PATINA, extra: armChunks(0.16, true) });
  const disc = metal({ name: 'rfDisc', color: new THREE.Color(hex('bronze')).lerp(new THREE.Color(hex('copper-light')), 0.4).getHex(), rough: 0.26, tarnish: 0.15, patina: PATINA, extra: armChunks(0.2, false) });
  const knob = metal({ name: 'rfKnob', color: hex('copper'), rough: 0.27, tarnish: 0.18, patina: PATINA, extra: armChunks(0.22, false) });
  const tube = metal({ name: 'rfTube', color: 0x2c1e14, rough: 0.4, brush: 'y', tarnish: 0.2, patina: PATINA, extra: withGlint(GLINT, armChunks(0.16, true)) });
  const plateMetal = metal({ name: 'rfPlate', color: hex('bronze-deep'), rough: 0.46, cast: 0.7, tarnish: 0.3, patina: PATINA, extra: armChunks(0.12, true) });
  for (const m of [back, plateMetal]) m.envMapIntensity = 3.2;
  dark.envMapIntensity = 1.5;
  tube.envMapIntensity = 1.5;
  for (const m of [bronze, bronzeCast, disc, knob]) m.envMapIntensity = 4;
  for (const m of [back, dark, tube, bronze, bronzeCast, disc, knob, plateMetal]) capBright(m, 0.95);
  const glint = glintUniforms();
  takeGlint(glint, tube);
  const tubeEnds = { a: new THREE.Vector3(), b: new THREE.Vector3() };
  const ink = dielectric('rfInk', 0x0d0806, 0.7, { vary: 0.05 });

  // ---- the dish, in its own space: axis along y, the middle of the face at the origin --------------------------
  const dish = new THREE.Group();
  dish.position.copy(D);
  dish.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  root.add(dish);
  // Roll the dish so its lathe seam lies on the side away from the visitor.
  const rollTo = new THREE.Vector3(0, 0, -1);
  {
    dish.updateMatrix();
    const inv = new THREE.Matrix4().copy(dish.matrix).invert();
    const p = rollTo.clone().add(D).applyMatrix4(inv);
    dish.rotateY(Math.atan2(p.x, p.z));
  }
  dish.updateMatrixWorld(true);
  let tris = 0;

  await pause();
  {
    const b = new Builder();
    const F = RF.FACE, S = RF.SHEET, R = RF.BEAD;
    // The face, from the rim in to the middle, so it looks up the axis.
    const facePts: [number, number][] = [];
    const N = 40;
    for (let i = N; i >= 0; i--) { const r = (F + 1.5) * (i / N) ** 1.15; facePts.push([r, bowl(Math.min(r, F))]); }
    b.add(lathe(facePts, 128), copperFace);
    // The rolled rim: the sheet runs up, rolls outward over a wire and turns back down.
    const bead: [number, number][] = [];
    const cx = F + R * 0.55, cy = bowl(F) + R * 0.2;
    for (let i = 0; i <= 18; i++) { const a = Math.PI * 1.08 - Math.PI * 2.0 + (i / 18) * Math.PI * 2.0; bead.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
    b.add(lathe(bead, 128), copperRim);
    // The spinning chuck's mark at the middle: a small domed button, where the stream strikes.
    const btn: [number, number][] = [];
    for (let i = 0; i <= 12; i++) { const r = 11.5 * (1 - i / 12); btn.push([r, 1.6 * Math.sqrt(1 - (r / 11.5) ** 2) + 0.2]); }
    b.add(lathe(btn, 64), copperFace);
    // The back of the sheet, from the middle out to under the bead.
    const backPts: [number, number][] = [];
    for (let i = 0; i <= 20; i++) { const r = (F + R * 0.6) * (i / 20); backPts.push([r, bowl(Math.min(r, F)) - S - (r > F ? (r - F) * 0.8 : 0)]); }
    b.add(lathe(backPts, 112), back);
    // A stiffening ring pressed into the back, two thirds out.
    const rib: [number, number][] = [];
    for (let i = 0; i <= 10; i++) { const a = Math.PI - (i / 10) * Math.PI; const r = 138 + Math.cos(a) * 6; rib.push([r, bowl(r) - S - Math.sin(a) * 2.4]); }
    b.add(lathe(rib, 112), back);
    // The boss at the middle of the back: a flange held by six screws, a hub, and the stem to the ball head.
    const boss: [number, number][] = [[0, -S - 22], [11, -S - 22], [11, -S - 16], [17, -S - 14.5], [21, -S - 11], [22, -S - 8.6], [40, -S - 7.2], [43, -S - 5.6], [44, -S - 1.4], [44, -S + 0.2]];
    b.add(lathe(boss, 96), bronze);
    const sc = screw(3.1);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      const m = xf({ p: [Math.cos(a) * 32, -S - 7.2, Math.sin(a) * 32], r: [Math.PI / 2, 0, 0] });
      b.add(sc.head.clone().applyMatrix4(new THREE.Matrix4().makeRotationZ(k * 0.9)), dark, m);
      b.add(sc.slot.clone().applyMatrix4(new THREE.Matrix4().makeRotationZ(k * 0.9)), ink, m);
    }
    const stem = lathe([[0, -S - 82], [7.5, -S - 82], [7.5, -S - 30], [9.5, -S - 27], [9.5, -S - 22], [0, -S - 22]], 48);
    b.add(stem, bronze);
    // The ball head's collar on the stem: a knurled copper locking ring over a bronze seat.
    b.add(knurled(14.5, 9, 22, 0.08), knob, xf({ p: [0, -S - 64, 0] }));
    b.add(lathe([[7.5, -S - 78], [16, -S - 76], [17.5, -S - 72], [16.5, -S - 69], [7.5, -S - 69]], 48), bronze);
    // A lug at the back near the rim on the arm's side, for the safety chain.
    const kl = new THREE.Vector3(...RF.KNUCKLE).applyMatrix4(new THREE.Matrix4().copy(dish.matrix).invert());
    const lugA = Math.atan2(kl.z, kl.x);
    dish.userData.lugA = lugA;
    const lr = F - 18;
    const lug = new THREE.TorusGeometry(4.4, 1.6, 10, 24);
    b.add(lug, dark, xf({ p: [Math.cos(lugA) * lr, bowl(lr) - S - 6.5, Math.sin(lugA) * lr], r: [0, -lugA, 0] }));
    b.add(rbox(10, 6, 4, 1.2), dark, xf({ p: [Math.cos(lugA) * lr, bowl(lr) - S - 4.4, Math.sin(lugA) * lr], r: [0, -lugA, 0] }));
    for (const m of b.build(dish, 'dish')) {
      tris += m.geometry.getAttribute('position').count / 3;
      if (m.material === copperFace) m.receiveShadow = false;
    }
  }

  // Points of the dish in the world.
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(dish.matrix);
  const B = toWorld(0, -RF.SHEET - 94, 0);
  const K = new THREE.Vector3(...RF.KNUCKLE);
  const P = new THREE.Vector3(...RF.PIVOT);
  const aK = K.clone().sub(B).cross(P.clone().sub(K)).normalize();
  if (aK.z < 0) aK.negate();

  await pause();
  // ---- the arm and the socket on the wall: one builder, so what never moves is drawn in as few calls as it can be --
  const b = new Builder();
  // The upper bar, which turns a little about the knuckle when the dish is struck, and the chain, which follows.
  const ub = new Builder(), cb = new Builder();
  const upper = new THREE.Group(), chain = new THREE.Group();
  root.add(upper, chain);
  {
    // The ball head: a ball on the dish's stem, gripped by a clamp block that the bar's two straps hold.
    const ball = new THREE.SphereGeometry(15.5, 28, 16);
    ub.add(ball, bronze, new THREE.Matrix4().setPosition(B));
    const u1 = K.clone().sub(B).normalize();
    const H = B.clone().addScaledVector(u1, 14);
    const clamp = new THREE.CylinderGeometry(22, 22, 24, 56);
    ub.add(clamp, bronzeCast, facing(H, aK, u1));
    // The straps: two flat bars with a long slot, either side of the clamp at one end and the knuckle at the other.
    const L1 = K.distanceTo(H);
    const v1 = aK.clone().cross(u1).normalize();
    const strap = slab(stadium(0, L1, 15, 20), [stadium(L1 * 0.27, L1 * 0.73, 4.6, 8), circle(0, 0, 4.2, 16), circle(0, L1, 4.2, 16)], -2.4, 2.4, 1.7, 3);
    {
      // How worn each point of a strap is: its edges and the lips of its slot, where hands and the other bar rub it.
      const sn = strap.getAttribute('normal'), wear = new Float32Array(sn.count * 4);
      for (let i = 0; i < sn.count; i++) wear[i * 4] = 1 - Math.abs(sn.getZ(i));
      strap.setAttribute('cell', new THREE.Float32BufferAttribute(wear, 4));
    }
    for (const s of [-1, 1]) {
      const m = new THREE.Matrix4().makeBasis(v1, u1, aK).setPosition(H.clone().addScaledVector(aK, s * 15.6));
      ub.add(strap, dark, m);
    }
    // The ball head's lock: a T handle on the clamp's bolt.
    {
      const at0 = H.clone().addScaledVector(aK, 18);
      ub.add(new THREE.CylinderGeometry(4.6, 5.4, 9, 24), bronze, facing(at0.clone().addScaledVector(aK, 4.5), aK));
      const bar = new THREE.CylinderGeometry(3.2, 3.2, 34, 20);
      const mid = at0.clone().addScaledVector(aK, 10);
      ub.add(bar, bronze, along(mid.clone().addScaledVector(u1, -17), mid.clone().addScaledVector(u1, 17)));
      for (const s of [-1, 1]) ub.add(new THREE.SphereGeometry(4.6, 20, 12), bronze, new THREE.Matrix4().setPosition(mid.clone().addScaledVector(u1, s * 17)));
      ub.add(new THREE.CylinderGeometry(4.2, 4.2, 6, 20), dark, facing(H.clone().addScaledVector(aK, -21), aK));
    }

    // The knuckle: two toothed discs, one on each bar, locked by a big knurled knob.
    {
      const lockOut = 15.6 + 2.2;
      b.add(toothed(23, 12, 30, 3.4), disc, facing(K.clone().addScaledVector(aK, -6), aK, u1));
      b.add(toothed(23, 12, 30, 3.4, Math.PI / 30), disc, facing(K.clone().addScaledVector(aK, 6), aK.clone().negate(), u1));
      b.add(knurled(19, 14, 24, 0.075), knob, facing(K.clone().addScaledVector(aK, lockOut + 7), aK));
      const cap = lathe([[0, 3.6], [8, 3.2], [13, 2.2], [16.5, 0.6], [17.5, 0]].reverse() as [number, number][], 64);
      b.add(cap, bronze, facing(K.clone().addScaledVector(aK, lockOut + 14), aK));
      const washer = lathe([[8, 0], [21, 0], [21.5, 0.6], [21.5, 1.6], [8, 1.6]], 64);
      b.add(washer, dark, facing(K.clone().addScaledVector(aK, lockOut), aK));
      const nut = new THREE.CylinderGeometry(9.5, 9.5, 6, 6);
      b.add(nut, dark, facing(K.clone().addScaledVector(aK, -lockOut - 3), aK));
    }

    // The lower bar: a tube from the knuckle down to the clevis on the socket, with bronze ferrules.
    {
      const u2 = P.clone().sub(K).normalize();
      const k0 = K.clone().addScaledVector(u2, 14), p0 = P.clone().addScaledVector(u2, -12);
      b.add(new THREE.CylinderGeometry(10.5, 10.5, 1, 40, 1, true).translate(0, 0.5, 0).scale(1, k0.distanceTo(p0), 1), tube, along(k0, p0));
      tubeEnds.a.copy(k0); tubeEnds.b.copy(p0);
      for (const [a, d] of [[K, 1], [P, -1]] as const) {
        const s0 = a.clone().addScaledVector(u2, d * 16), s1 = a.clone().addScaledVector(u2, d * 34);
        const fer = lathe([[10.6, 0], [12.8, 0.8], [13.2, 2], [13.2, 15], [12.4, 17.4], [10.6, 18]], 48);
        b.add(fer, bronze, along(d > 0 ? s0 : s1, d > 0 ? s1 : s0));
        for (let g = 0; g < 2; g++) {
          const ring = new THREE.TorusGeometry(13.2, 0.55, 5, 40); ring.rotateX(Math.PI / 2);
          b.add(ring, bronzeCast, along(a.clone().addScaledVector(u2, d * (22.5 + g * 4.5)), a.clone().addScaledVector(u2, d * 40)));
        }
      }
      // The neck that joins the tube to each joint.
      b.add(new THREE.CylinderGeometry(9, 9, 1, 32).translate(0, 0.5, 0).scale(1, 14, 1), bronzeCast, along(K.clone().addScaledVector(u2, 4), K.clone().addScaledVector(u2, 18)));
      b.add(new THREE.CylinderGeometry(9, 9, 1, 32).translate(0, 0.5, 0).scale(1, 12, 1), bronzeCast, along(P.clone().addScaledVector(u2, -16), P.clone().addScaledVector(u2, -4)));
    }

    // The safety chain: from the lug on the dish's back to the upper strap, hanging a little.
    {
      const lr = RF.FACE - 18;
      const la = dish.userData.lugA as number;
      const A = toWorld(Math.cos(la) * lr, bowl(lr) - RF.SHEET - 11, Math.sin(la) * lr);
      const C = H.clone().addScaledVector(u1, L1 * 0.42).addScaledVector(aK, 18.5).addScaledVector(v1, -9);
      const len = A.distanceTo(C) * 1.12;
      const count = Math.max(4, Math.round(len / 10.5));
      const pt = (t: number) => A.clone().lerp(C, t).add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * len * 0.16, 0));
      const link = new THREE.TorusGeometry(1, 0.28, 6, 14); link.scale(4.2, 6.8, 4.2);
      for (let i = 0; i < count; i++) {
        const t0 = i / count, t1 = (i + 1) / count;
        const p0 = pt(t0), p1 = pt(t1), mid = p0.clone().lerp(p1, 0.5);
        const dir = p1.clone().sub(p0).normalize();
        let side = new THREE.Vector3(0, 0, 1).cross(dir).normalize();
        if (i % 2) side = side.cross(dir).normalize();
        const m = along(mid, mid.clone().add(dir), side);
        cb.add(link, dark, m);
      }
      const split = new THREE.TorusGeometry(6, 0.9, 8, 40, Math.PI * 1.9);
      cb.add(split, bronze, facing(C, aK));
      chain.userData.ends = [A, C];
    }
  }

  await pause();
  // ---- the socket on the wall -------------------------------------------------------------------------------
  {
    const Pl = RF.PLATE;
    b.add(slab(rounded(rrect(Pl.x, Pl.y, Pl.w, Pl.h, Pl.r)), [], 0, Pl.t, 2.2, 3), plateMetal);
    // A raised border pressed round the plate's face.
    b.add(slab(rounded(rrect(Pl.x, Pl.y, Pl.w - 12, Pl.h - 12, Pl.r - 6)), [rounded(rrect(Pl.x, Pl.y, Pl.w - 16, Pl.h - 16, Pl.r - 8))], Pl.t - 0.5, Pl.t + 1.1, 0.4, 2), plateMetal);
    const sc = screw(5.6);
    const rnd = seeded(73);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const p: [number, number, number] = [Pl.x + sx * (Pl.w / 2 - 13), Pl.y + sy * (Pl.h / 2 - 13), Pl.t + 0.8];
      const tw = rnd() * Math.PI;
      b.add(sc.head, bronze, xf({ p, r: [0, 0, tw] }));
      b.add(sc.slot, ink, xf({ p, r: [0, 0, tw] }));
      b.add(new THREE.TorusGeometry(6.4, 0.7, 8, 32), dark, xf({ p: [p[0], p[1], Pl.t + 0.5] }));
    }
    // The socket: a turned boss out from the plate, a collar, and a knurled thumbscrew in its side.
    const sy = P.y, sxp = P.x;
    const sock = lathe([[0, 0], [27, 0], [27, 3], [25, 5.5], [19.5, 7.5], [17.5, 10], [17.5, 46], [20.5, 47.5], [20.5, 54], [18.5, 56], [0, 56]], 72);
    b.add(sock, bronze, xf({ p: [sxp, sy, Pl.t + 1.1], r: [Math.PI / 2, 0, 0] }));
    {
      const ts = new THREE.Vector3(sxp, sy, Pl.t + 30), out = new THREE.Vector3(0.83, -0.55, 0).normalize();
      b.add(new THREE.CylinderGeometry(3.6, 3.6, 12, 16), dark, along(ts.clone().addScaledVector(out, 16), ts.clone().addScaledVector(out, 28)));
      b.add(knurled(9, 8, 16, 0.08), knob, facing(ts.clone().addScaledVector(out, 32), out));
    }
    // The clevis on the socket's tip: two cheeks round the lower bar's toothed disc, a bolt and a wing nut.
    const aS = new THREE.Vector3(0, 0, 1).cross(K.clone().sub(P)).normalize();
    const zUp = new THREE.Vector3(0, 0, 1);
    const vS = aS.clone().cross(zUp).normalize();
    const cheek = slab(rounded([[-14, -26, 2], [14, -26, 2], [14, 6, 13.9], [-14, 6, 13.9]]), [circle(0, 0, 3.4)], -2.6, 2.6, 0.8, 2);
    for (const s of [-1, 1]) b.add(cheek, bronzeCast, new THREE.Matrix4().makeBasis(vS, zUp, aS).setPosition(P.clone().addScaledVector(aS, s * 9.8)));
    b.add(rbox(28, 26, 8, 2), bronzeCast, xf({ p: [P.x, P.y, P.z - 23] }).multiply(new THREE.Matrix4().makeBasis(vS, aS, zUp)));
    b.add(toothed(16.5, 13, 22, 0), disc, facing(P, aS, zUp));
    b.add(new THREE.CylinderGeometry(3.6, 3.6, 34, 16), dark, facing(P, aS));
    const domeNut = lathe([[0, 6], [4, 5.6], [6.5, 4], [7.2, 2], [7.2, 0]].reverse() as [number, number][], 32);
    b.add(domeNut, bronze, facing(P.clone().addScaledVector(aS, -12.4), aS.clone().negate()));
    {
      const w0 = P.clone().addScaledVector(aS, 12.4);
      b.add(new THREE.CylinderGeometry(6.4, 7.2, 8, 24), bronze, facing(w0.clone().addScaledVector(aS, 4), aS));
      const wingO: V[] = [[0, -4, 1], [16, -6, 3.5], [19, 2, 5.5], [10, 4.5, 2], [0, 3.6, 1]];
      const wing = slab(rounded(wingO), [], -1.5, 1.5, 0.6, 2);
      const up = vS.clone();
      for (const s of [-1, 1]) {
        const ex = up.clone().multiplyScalar(s), ey = aS.clone(), ez = ex.clone().cross(ey).normalize();
        b.add(wing, bronze, new THREE.Matrix4().makeBasis(ex, ey, ez).setPosition(w0.clone().addScaledVector(aS, 5).addScaledVector(up, s * 5)));
      }
    }
    // The maker's plate, riveted under the socket.
    const mp = { x: Pl.x, y: Pl.y - 34, w: 54, h: 20 };
    b.add(slab(rounded(rrect(mp.x, mp.y, mp.w, mp.h, 2.2)), [], Pl.t + 1.1, Pl.t + 2.4, 0.4, 2), copperPlate);
    for (const sx of [-1, 1]) b.add(new THREE.SphereGeometry(1.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), copperRim, xf({ p: [mp.x + sx * (mp.w / 2 - 3.6), mp.y, Pl.t + 2.4] }));
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(mp.w - 13, mp.h - 4), makersMark());
    mark.position.set(mp.x, mp.y, Pl.t + 2.45);
    mark.name = 'mark';
    root.add(mark);
    for (const m of [...b.build(root, 'arm'), ...ub.build(upper, 'upper'), ...cb.build(chain, 'chain')]) { tris += m.geometry.getAttribute('position').count / 3; if (m.material === ink) m.castShadow = false; }
  }

  // ---- the wall -------------------------------------------------------------------------------------------------
  const wallGeo = new THREE.PlaneGeometry(FRAME_H * 1.8, FRAME_H * 1.4);
  const wallC = { value: new THREE.Vector2() };
  const wall = new THREE.Mesh(wallGeo, wallMaterial(wallC, [480, 340]));
  wall.position.set(-60, -70, 0);
  wall.receiveShadow = true;
  wall.userData.noAO = true;
  wall.userData.noWire = true;
  wall.name = 'wall';
  root.add(wall);
  tris += 2;

  const [cA, cC] = chain.userData.ends as THREE.Vector3[];
  return { root, dish, upper, chain, knock: { ball: B, knuckle: K, axis: aK, chainTop: cA, chainFoot: cC }, face, wall, wallC, centre: D.clone(), glint, tube: tubeEnds, tris };
}
