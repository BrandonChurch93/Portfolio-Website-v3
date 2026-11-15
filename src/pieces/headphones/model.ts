import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder, pause, lathe, rbox, xf, seeded } from '../../world/build';
import { rounded, rrect, screw, slab } from '../../world/shape';
import { dielectric, lin, metal, type Chunks } from '../../world/surface';
import { hex } from '../../config/palette';

// The headphones on their hook, in millimetres under a root scaled by 0.001. The page's ground is the wall, the plane
// z = 0, and the visitor looks straight at it from +z. The pair's own space has the point where the band bears on the
// hook at its origin, the band arching over it and the cups hanging below, ear to ear along x and front to back
// along z. The pair is turned about the upright through that point, so the left cup shows its face and the right cup
// its cushion, and it swings about the hook's peg.

const D2R = Math.PI / 180;

export const HP = {
  SCALE: 0.001,
  // How far the pair is turned about the upright, so the form reads round, and how far it leans out at its foot,
  // where the cups rest against the wall: the peg is short, and the wall holds the cups off plumb.
  TURN: 26 * D2R,
  LEAN: 9 * D2R,
  // The cups: where the shell meets the cushion along x, the middle's height, the half depth and half height of the
  // shell, how thick the shell is, and the superellipse of their outline.
  CUP: { x: 72, y: -180, d: 37, h: 43, shell: 21.8, n: 3.4 },
  // The pivot a cup turns on in its yoke: across, up and the yoke's half spread front to back.
  PIVOT: { x: 83, y: -172, z: 42 },
  // The frame's arch: its middle's height, its half span and rise for the rails, and for the canopy under them.
  ARCH: { cy: -50, rx: 83, ry: 62, crx: 79, cry: 45.5, bear: 4.5, bearW: 15 },
  // The rails' half spread front to back, the canopy's half width.
  RAIL_Z: 19.6,
  CANOPY_W: 19,
  // The stems: where they leave the housings and where they meet the yoke's collar.
  STEM: { top: -86, foot: -127, r: 2.4 },
  // The yoke's crossbar.
  YOKE_Y: -133,
  // The hook: the peg's radius where the band bears, its rise toward its tip, and the plate on the wall.
  PEG: { r: 5.5, tilt: 2 * D2R },
  PLATE: { y: 2, w: 30, h: 82, t: 6.5, r: 9, screws: [31, -30] as const },
  // How far the cups' backs stand off the wall: they rest on it.
  GAP: 0.6,
  // How much of the host's height the whole thing, hook and all, takes.
  SPAN: 0.72,
} as const;

type Sec = [rx: number, rz: number, y: number];

// The cup's outline along its axis, from where it tucks under the cushion to the soft edge round its face, and its
// face, a turned plate set a little down inside that edge.
const SHELL: Sec[] = [
  [31.2, 37.2, -0.6], [33.6, 39.6, 0.4], [35.7, 41.7, 1.8], [36.8, 42.8, 4], [37, 43, 7], [36.8, 42.8, 11.5],
  [36.1, 42.1, 14.8], [34.8, 40.8, 17.6], [33.0, 39.0, 19.8], [31.6, 37.6, 20.9], [30.7, 36.7, 21.0], [30.2, 36.2, 20.5],
];
const FACE: Sec[] = [[29.7, 35.7, 20.1], [29.9, 35.9, 21.0], [29.6, 35.6, 21.6], [29.0, 35.0, 21.8]];
// The cushion, from its inner wall round its face to where it tucks under the shell: soft and full.
const CUSHION: Sec[] = [
  [22.2, 28.2, -6], [21.7, 27.7, -13], [22.0, 28.0, -18.8], [23.6, 29.6, -21.3], [26.6, 32.6, -22.3], [30.2, 36.2, -22.4],
  [33.2, 39.2, -21.2], [35.0, 41.0, -18.8], [35.8, 41.8, -14.5], [35.8, 41.8, -8.5], [34.9, 40.9, -3.8], [33.2, 39.2, -0.9], [31.4, 37.4, 0.3],
];

// The housing's half depth front to back: it takes in the rails and the canopy.
const HOUSING_Z = 23.2;

// The highest point (the plate's top) and the lowest (the cups' feet), so the host frames the whole of it.
const TOP = HP.PLATE.y + HP.PLATE.h / 2;
const FOOT = HP.CUP.y - HP.CUP.h;
export const FRAME_H = (TOP - FOOT) / HP.SPAN;
export const MID_Y = (TOP + FOOT) / 2;

// The pair's turn and lean, as it hangs straight.
export const PAIR_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-HP.LEAN, HP.TURN, 0, 'XYZ'));

// A cup's own space (axis z, out from the head) in the pair's: s is -1 for the left cup and 1 for the right.
export const cupMatrix = (s: number) => new THREE.Matrix4().makeRotationY((s * Math.PI) / 2).setPosition(s * HP.CUP.x, HP.CUP.y, 0);

// How far out from the wall the band bears on the peg: the pair's farthest point back, turned and leaning, kept GAP
// off the wall. Worked out from the parts' own sizes, so it holds without building anything.
export const BEAR_Z = (() => {
  let least = Infinity;
  const v = new THREE.Vector3();
  const back = (p: THREE.Vector3) => { least = Math.min(least, v.copy(p).applyQuaternion(PAIR_Q).z); };
  const e = 2 / HP.CUP.n;
  for (const s of [-1, 1]) {
    const m = cupMatrix(s);
    for (const [rx, rz, y] of [...SHELL, ...CUSHION]) for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      back(new THREE.Vector3(rx * Math.sign(c) * Math.abs(c) ** e, -rz * Math.sign(sn) * Math.abs(sn) ** e, y).applyMatrix4(m));
    }
    for (const z of [-1, 1]) back(new THREE.Vector3(s * (HP.PIVOT.x + 3.4), HP.PIVOT.y, z * (HP.PIVOT.z + 2.2 + 3.4)));
    for (const z of [-1, 1]) back(new THREE.Vector3(s * HP.ARCH.rx, HP.STEM.top, z * HOUSING_Z));
  }
  return HP.GAP - least;
})();

// The bearing point in the world.
export const BEAR = new THREE.Vector3(0, 0, BEAR_Z);

export interface HeadphonesModel {
  root: THREE.Group;
  // Turns about the peg for the swing.
  swing: THREE.Group;
  // Each cup on its pivot, turned for its lag behind the band.
  cups: [THREE.Group, THREE.Group];
  wall: THREE.Mesh;
  wallC: { value: THREE.Vector2 };
  look: Look;
  tris: number;
}

const PATINA: [number, number, number] = [0.72, 0.6, 0.52];

// A ring of superellipse sections, stacked along y in order, smooth all round. Traced with the solid on the left of
// the outline in the (r, y) plane, its normals face out.
function ringLoft(secs: Sec[], n: number, seg: number, cap: 'none' | 'top' = 'none'): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  const e = 2 / n;
  const pt = (rx: number, rz: number, i: number): [number, number] => {
    const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    return [rx * Math.sign(c) * Math.abs(c) ** e, rz * Math.sign(s) * Math.abs(s) ** e];
  };
  for (const [rx, rz, y] of secs) for (let i = 0; i < seg; i++) { const [x, z] = pt(rx, rz, i); pos.push(x, y, z); }
  for (let j = 0; j < secs.length - 1; j++) for (let i = 0; i < seg; i++) {
    const a = j * seg + i, b = j * seg + ((i + 1) % seg);
    idx.push(a, a + seg, b, b, a + seg, b + seg);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (cap === 'none') return g;
  // The cap keeps its own rim, so its flat face is not shaded as a dome by the side's normals.
  const [rx, rz, y] = secs[secs.length - 1];
  const lid = capDown(rx, rz, n, -y, seg);
  lid.rotateX(Math.PI);
  lid.rotateY(Math.PI);
  return mergeGeometries([g.toNonIndexed(), lid.toNonIndexed()], false) ?? g;
}

// A flat disc of a superellipse at height y, facing down the y axis.
function capDown(rx: number, rz: number, n: number, y: number, seg: number): THREE.BufferGeometry {
  const pos: number[] = [0, y, 0], idx: number[] = [];
  const e = 2 / n;
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    pos.push(rx * Math.sign(c) * Math.abs(c) ** e, y, rz * Math.sign(s) * Math.abs(s) ** e);
  }
  for (let i = 0; i < seg; i++) idx.push(0, 1 + i, 1 + ((i + 1) % seg));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A section swept along a path that lies in a plane square to side: u across the plane along side, v in it.
function sweep(path: THREE.Vector3[], side: THREE.Vector3, hu: number, hv: number, n: number, seg = 16): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  const e = 2 / n;
  const T = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i < path.length; i++) {
    T.copy(path[Math.min(path.length - 1, i + 1)]).sub(path[Math.max(0, i - 1)]).normalize();
    N.copy(side).cross(T).normalize();
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const u = hu * Math.sign(c) * Math.abs(c) ** e, v = hv * Math.sign(s) * Math.abs(s) ** e;
      pos.push(path[i].x + side.x * u + N.x * v, path[i].y + side.y * u + N.y * v, path[i].z + side.z * u + N.z * v);
    }
  }
  for (let i = 0; i < path.length - 1; i++) for (let k = 0; k < seg; k++) {
    const a = i * seg + k, b = i * seg + ((k + 1) % seg);
    idx.push(a, b, a + seg, b, b + seg, a + seg);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Faces out from the path: checked on one face, and the whole turned over if it looks in.
  const p = g.getAttribute('position'), nn = g.getAttribute('normal');
  const mid = Math.floor(path.length / 2) * seg;
  const out = new THREE.Vector3(p.getX(mid), p.getY(mid), p.getZ(mid)).sub(path[Math.floor(path.length / 2)]);
  if (out.dot(new THREE.Vector3(nn.getX(mid), nn.getY(mid), nn.getZ(mid))) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
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

// Holds a metal's brightest light under the glow's threshold, and turns it to pale's own hue as it nears the top, so
// a highlight is a crisp pale line or point: never a soft spot, and never white on the parts made neutral below.
function capBright(m: THREE.MeshPhysicalMaterial, top: number): void {
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `{ float hpL = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b));
  outgoingLight = mix(outgoingLight, ${lin(hex('pale'))} * hpL, smoothstep(0.3, 0.85, hpL) * smoothstep(0.35, 0.0, (hpL - min(outgoingLight.b, outgoingLight.g)) / max(hpL, 1e-4) - 0.12));
  outgoingLight *= min(1.0, ${top.toFixed(2)} / max(1e-4, hpL)); }
#include <opaque_fragment>`);
  };
  warm(m);
}

// The neutral albedos below cancel the pale light's warmth; where the room's reflection lights a part instead, they
// would tip toward blue. Green is kept at or under red and blue at or under green, so a grey is grey or warm, never cool.
function warm(m: THREE.MeshPhysicalMaterial): void {
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight.g = min(outgoingLight.g, outgoingLight.r); outgoingLight.b = min(outgoingLight.b, outgoingLight.g);\n#include <opaque_fragment>');
  };
}

// What the metal reflects: long strip lights standing off the screen, as a photographer lights polished metal. One is
// a tall strip at the cursor's light, so its reflection slides across the cups as the light moves. One lies along
// the top behind the pair and draws a crisp pale line along every upper edge, and two stand at the sides behind it
// and draw the outer edges: the left one stands where the left cup's face, turned away, looks. Worked out per pixel from the reflected ray, sharp on polished metal and spread on satin.
export interface Look { uLampW: { value: THREE.Vector3 }; uLampK: { value: number } }
const v3 = (x: number, y: number, z: number) => `vec3(${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)})`;
function stripHead(): string {
  const A = { x: 0, y: MID_Y * HP.SCALE, z: BEAR_Z * HP.SCALE };
  return /* glsl */ `
uniform vec3 uLampW; uniform float uLampK, uStripK;
float hpStrip(vec3 P, vec3 R, vec3 C, vec3 D, float halfL, float halfW, float blur){
  vec3 toC = C - P; float dist = length(toC);
  vec3 n = cross(toC, D); n /= max(length(n), 1e-5);
  float off = abs(dot(R, n));
  float w = halfW / dist;
  float k = 1.0 - smoothstep(w * 0.4, w + blur, off);
  vec3 Rp = R - dot(R, n) * n; Rp /= max(length(Rp), 1e-5);
  float facing = dot(Rp, toC / max(dist, 1e-5));
  float cosL = cos(atan(halfL / dist));
  return k * smoothstep(cosL - 0.04, cosL + 0.03, facing);
}
float hpStrips(vec3 P, vec3 R, float blur, float edge){
  return hpStrip(P, R, uLampW, vec3(0.0, 1.0, 0.0), 0.8, 0.045, blur) * uLampK * 2.6
    + hpStrip(P, R, ${v3(A.x, A.y + 0.9, A.z - 0.55)}, vec3(1.0, 0.0, 0.0), 0.9, 0.035, blur) * 1.5 * edge
    + hpStrip(P, R, ${v3(A.x - 0.75, A.y + 0.15, A.z - 0.62)}, vec3(0.0, 1.0, 0.0), 0.5, 0.06, blur) * 0.9 * edge
    + hpStrip(P, R, ${v3(A.x + 1.0, A.y + 0.25, A.z - 0.4)}, vec3(0.0, 1.0, 0.0), 0.8, 0.03, blur) * 0.6 * edge;
}`;
}
function stripEmissive(): string {
  return /* glsl */ `
  { vec3 Vv = normalize(vViewPosition);
    mat3 toW = transpose(mat3(viewMatrix));
    vec3 Pw = cameraPosition + toW * (-vViewPosition);
    vec3 Rw = normalize(toW * reflect(-Vv, normal));
    float nv = clamp(dot(normal, Vv), 0.0, 1.0);
    vec3 spec = mix(diffuseColor.rgb, vec3(1.0), pow(1.0 - nv, 4.0));
    float blur = roughnessFactor * roughnessFactor * 0.9;
    totalEmissiveRadiance += ${lin(hex('pale'))} * spec * hpStrips(Pw, Rw, blur, 1.0) * uStripK; }`;
}
function stripChunks(extra: Chunks = {}): Chunks {
  return { ...extra, head: `${extra.head ?? ''}\n${stripHead()}`, emissive: `${extra.emissive ?? ''}\n${stripEmissive()}` };
}

// The cup's face: turned rings round its middle, finer the closer it is seen, and a ring of small holes inside its
// edge for the microphones. Both fade out before they are finer than a pixel, so neither crawls.
function faceChunks(): Chunks {
  const c = HP.CUP;
  return {
    head: /* glsl */ `
float hpPx(){ return max(length(fwidth(vObj)), 1e-4); }
float hpQ(vec2 p){ vec2 a = abs(p) / vec2(${(FACE[2][0]).toFixed(2)}, ${(FACE[2][1]).toFixed(2)}); return pow(pow(a.x, ${c.n.toFixed(1)}) + pow(a.y, ${c.n.toFixed(1)}), ${(1 / c.n).toFixed(4)}); }
float hpHoles(vec2 p, float px){
  float q = hpQ(p);
  float ang = atan(p.y, p.x);
  float cells = 72.0;
  float k = fract(ang / 6.2831853 * cells) - 0.5;
  float along = k * 6.2831853 * 29.0 / cells;
  float across = (q - 0.9) * 34.0;
  float d = length(vec2(along, across));
  float r = 0.78;
  float hole = 1.0 - smoothstep(r - px * 0.7, r + px * 0.7, d);
  float seen = 1.0 - smoothstep(0.25, 0.6, px / r);
  return mix(0.2 * (1.0 - smoothstep(0.02, 0.05, abs(q - 0.9))), hole, seen);
}
float hpGroove(vec2 p, float px){ float d = abs(hpQ(p) - 0.62) * 34.0; return 1.0 - smoothstep(0.12, 0.12 + px, d); }
float hpRings(vec2 p, float px){
  float r = length(p);
  float a1 = 1.0 - smoothstep(0.3, 0.75, px / 0.45);
  float a2 = 1.0 - smoothstep(0.3, 0.75, px / 1.2);
  return sin(r * 13.96) * 0.5 * a1 + (wNoise(vec3(r * 3.1, 4.0, 0.0)) - 0.5) * 0.5 * a2;
}`,
    color: /* glsl */ `
  { float px = hpPx(); vec2 p = vObj.xy;
    diffuseColor.rgb *= 1.0 + 0.16 * hpRings(p, px);
    diffuseColor.rgb *= 1.0 - 0.6 * hpGroove(p, px);
    diffuseColor.rgb *= 1.0 - 0.9 * hpHoles(p, px); }`,
    rough: /* glsl */ `
  { float px = hpPx(); roughnessFactor = clamp(roughnessFactor - 0.05 * hpRings(vObj.xy, px) + 0.5 * hpHoles(vObj.xy, px), 0.05, 1.0); }`,
    normal: /* glsl */ `
  { float px = hpPx(); vec2 p = vObj.xy; float r = max(length(p), 1e-3); float e = 0.12;
    float dh = (hpRings(p * (r + e) / r, px) - hpRings(p * (r - e) / r, px)) / (2.0 * e);
    vec2 g = p / r * (dh * 0.012 + (hpGroove(p * (r + e) / r, px) - hpGroove(p * (r - e) / r, px)) / (2.0 * e) * 0.25);
    normal = normalize(normal - (g.x * vAxX + g.y * vAxY)); }`,
  };
}

// Knitted cloth: rows of small loops, the open stitch darker, faded out where a stitch is under three pixels. Every
// cloth is one program: what runs where (uKnit.w, the canopy along its arch, a cushion round its cup, the cloth over
// the driver flat), the stitch's size (uKnit.xy) and depth (uKnit.z) are uniforms, and uKnitOn 0 is a plain finish.
function knitChunks(): Chunks {
  return {
    head: /* glsl */ `
uniform vec4 uKnit; uniform float uKnitOn;
float hpKnit(out float seen){
  float u = uKnit.w < 0.5 ? vObj.z : uKnit.w < 1.5 ? atan(vObj.y, vObj.x) * 34.0 : vObj.x;
  float v = uKnit.w < 0.5 ? atan(vObj.y - (${HP.ARCH.cy.toFixed(1)}), vObj.x) * 70.0 : uKnit.w < 1.5 ? vObj.z : vObj.y;
  float su = 1.0 - smoothstep(0.18, 0.4, fwidth(u) / uKnit.x);
  float sv = 1.0 - smoothstep(0.18, 0.4, fwidth(v) / uKnit.y);
  seen = sv * uKnitOn;
  float w = abs(fract(u / uKnit.x) - 0.5) * 2.0;
  float row = fract(v / uKnit.y + w * 0.55 * su);
  float loop = smoothstep(0.0, 0.35, row) * (1.0 - smoothstep(0.55, 1.0, row));
  float gap = smoothstep(0.82, 1.0, w) * su;
  return clamp(loop * (1.0 - gap), 0.0, 1.0);
}`,
    color: /* glsl */ `
  { float seen; float k = hpKnit(seen);
    diffuseColor.rgb *= mix(1.0, 0.55 + 0.75 * k, seen); }`,
    rough: /* glsl */ `
  { float seen; float k = hpKnit(seen); roughnessFactor = clamp(roughnessFactor + 0.12 * (1.0 - k) * seen, 0.05, 1.0); }`,
    normal: /* glsl */ `
  { float seen; float k = hpKnit(seen);
    vec2 g = vec2(dFdx(k), dFdy(k)) * uKnit.z * seen;
    normal = normalize(normal + vec3(-g.x, -g.y, 0.0)); }`,
  };
}

// The wall takes the pair's shadow close to it and nothing else: no light of its own, fading out well inside the host.
function wallMaterial(centre: { value: THREE.Vector2 }, reach: [number, number]): THREE.ShadowMaterial {
  const m = new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.62, depthWrite: false });
  m.name = 'hpWall';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWallC = centre;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWall;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWall = position.xy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWall; uniform vec2 uWallC;').replace('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );', `
  vec2 q = (vWall - uWallC) / vec2(${reach[0].toFixed(1)}, ${reach[1].toFixed(1)});
  float d2 = dot(q, q);
  gl_FragColor = vec4(color, opacity * (1.0 - getShadowMask()) * exp(-2.0 * d2) * (1.0 - smoothstep(0.6, 1.0, sqrt(d2))));`);
  };
  m.customProgramCacheKey = () => 'hpWall';
  return m;
}

// The canopy's line: an arch under the rails, lifted a little where the peg bears on it.
export function canopyY(x: number): number {
  const a = HP.ARCH;
  const k = Math.max(0, 1 - (x / a.crx) ** 2);
  return a.cy + a.cry * Math.sqrt(k) + a.bear * Math.exp(-((x / a.bearW) ** 2));
}

function archPath(rx: number, ry: number, cy: number, lift: (x: number) => number, z: number, end: number, n = 96): THREE.Vector3[] {
  const out: THREE.Vector3[] = [new THREE.Vector3(rx, end, z)];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI;
    const x = rx * Math.cos(t);
    out.push(new THREE.Vector3(x, cy + ry * Math.sin(t) + lift(x), z));
  }
  out.push(new THREE.Vector3(-rx, end, z));
  return out;
}

// The made up model and serial printed along the inside of the canopy, on the side that faces the visitor.
const SERIAL = { text: 'HB·07   SN 2419-0731   R', from: 0.2, to: 0.78, wide: 6.4 };
function serialStrip(): THREE.Mesh {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '600 84px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';
  (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px';
  g.fillText(SERIAL.text, c.width / 2, c.height / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
  const a = HP.ARCH, n = 48, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const tt = SERIAL.from + ((SERIAL.to - SERIAL.from) * i) / n;
    const x = a.crx * Math.cos(tt), y = canopyY(x);
    const nx = Math.cos(tt) / a.crx, ny = Math.sin(tt) / a.cry, l = Math.hypot(nx, ny);
    const px = x - (nx / l) * 0.12, py = y - (ny / l) * 0.12;
    for (const k of [0, 1]) { pos.push(px, py, (k - 0.5) * SERIAL.wide); uv.push(1 - i / n, k); }
    if (i < n) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: hex('bronze'), roughness: 0.7, alphaMap: t, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  m.name = 'hpSerial';
  const mesh = new THREE.Mesh(geo, m);
  mesh.name = 'serial';
  mesh.userData.noAO = true;
  return mesh;
}

// A grey that stays grey. Every light is pale, which is warm, so a plain grey lit by it comes out tan. These albedos
// cancel most of the pale light's warmth, so the parts that should be neutral come out a warm grey: v is the albedo,
// tint the warmth left, in linear light.
const PALE_LIN = new THREE.Color(hex('pale'));
function neutral(m: THREE.MeshPhysicalMaterial, v: number, tint: [number, number, number] = [1, 0.93, 0.84]): void {
  const c = [tint[0] / PALE_LIN.r, tint[1] / PALE_LIN.g, tint[2] / PALE_LIN.b], top = Math.max(...c);
  m.color.setRGB((v * c[0]) / top, (v * c[1]) / top, (v * c[2]) / top, THREE.LinearSRGBColorSpace);
  if (m.sheen > 0) m.sheenColor.copy(m.color).multiplyScalar(1.6);
}

export async function buildHeadphones(): Promise<HeadphonesModel> {
  const root = new THREE.Group();
  root.scale.setScalar(HP.SCALE);
  let tris = 0;
  const count = (ms: THREE.Mesh[]) => { for (const m of ms) tris += m.geometry.getAttribute('position').count / 3; return ms; };

  await pause();
  // ---- materials ---------------------------------------------------------------------------------------------
  // Copper is the accent: the ring set into each face, the crown, the pivots' caps and the collars. The body is a
  // satin anodised warm dark steel, the stems and rails polished steel, the cushions and the canopy cloth.
  const look: Look = { uLampW: { value: new THREE.Vector3() }, uLampK: { value: 1 } };
  // Every plain metal is one program and differs only in color, roughness, its room's reflection and how strongly
  // it shows the strips; the turned face is a second, every cloth a third.
  const metalOf = (name: string, key: string, rough: number, env: number, k: number, extra: Chunks = {}) => {
    const m = metal({ name, color: 0x808080, rough, brush: 'none', tarnish: 0.06, patina: PATINA, extra: stripChunks(extra) });
    m.userData.uniforms = { ...look, uStripK: { value: k } };
    m.envMapIntensity = env;
    capBright(m, 0.98);
    m.customProgramCacheKey = () => key;
    return m;
  };
  const anod = metalOf('hpAnod', 'hpMetal', 0.46, 2.2, 1);
  const steel = metalOf('hpSteel', 'hpMetal', 0.24, 1.2, 1);
  const polished = metalOf('hpPolished', 'hpMetal', 0.12, 1.6, 1);
  const copper = metalOf('hpCopper', 'hpMetal', 0.22, 2.4, 0.8);
  const bronze = metalOf('hpBronze', 'hpMetal', 0.3, 2.4, 0.6);
  const plateM = metalOf('hpPlate', 'hpMetal', 0.5, 0.9, 0.25);
  const faceSteel = metalOf('hpFace', 'hpFace', 0.4, 2.2, 1, faceChunks());
  copper.color.set(hex('copper'));
  bronze.color.set(hex('bronze'));
  plateM.color.set(hex('bronze-deep'));
  const clothOf = (name: string, rough: number, sheen: number, knit: [number, number, number, number] | null) => {
    const m = dielectric(name, 0x808080, rough, { sheen, vary: 0.04, extra: knitChunks() });
    m.userData.uniforms = { uKnit: { value: new THREE.Vector4(...(knit ?? [1, 1, 0, 2])) }, uKnitOn: { value: knit ? 1 : 0 } };
    warm(m);
    m.customProgramCacheKey = () => 'hpCloth';
    return m;
  };
  const canopy = clothOf('hpCanopy', 0.82, 0.8, [1.7, 1.25, 0.6, 0]);
  const cushion = clothOf('hpCushion', 0.86, 0.8, [1.7, 1.3, 0.6, 1]);
  const cloth = clothOf('hpCloth', 0.92, 0.3, [0.8, 0.8, 0.25, 2]);
  const piping = clothOf('hpPiping', 0.45, 0.05, null);
  const ink = clothOf('hpInk', 0.7, 0.05, null);
  neutral(anod, 0.075);
  neutral(faceSteel, 0.1);
  neutral(steel, 0.035);
  neutral(polished, 0.3);
  neutral(canopy, 0.026, [1, 0.94, 0.86]);
  neutral(cushion, 0.036, [1, 0.94, 0.86]);
  neutral(cloth, 0.009);
  neutral(piping, 0.015);
  ink.color.set(0x0b0705);
  const a = HP.ARCH;

  // ---- the hook on the wall -----------------------------------------------------------------------------------
  await pause();
  {
    const b = new Builder();
    const P = HP.PLATE;
    b.add(slab(rounded(rrect(0, P.y, P.w, P.h, P.r)), [], 0, P.t, 2.2, 3), plateM);
    b.add(slab(rounded(rrect(0, P.y, P.w - 9, P.h - 9, P.r - 4.5)), [rounded(rrect(0, P.y, P.w - 13, P.h - 13, P.r - 6.5))], P.t - 0.4, P.t + 1.0, 0.35, 2), plateM);
    const sc = screw(4.6);
    const rnd = seeded(91);
    for (const sy of P.screws) {
      const tw = rnd() * Math.PI;
      b.add(sc.head, bronze, xf({ p: [0, sy, P.t + 0.3], r: [0, 0, tw] }));
      b.add(sc.slot, ink, xf({ p: [0, sy, P.t + 0.3], r: [0, 0, tw] }));
      b.add(new THREE.TorusGeometry(5.3, 0.55, 8, 32), plateM, xf({ p: [0, sy, P.t + 0.2] }));
    }
    // The peg: a turned rose on the plate, a neck the band rests on, and a knob at its tip that keeps the band on.
    const L = BEAR_Z + 22 - P.t;
    const r = HP.PEG.r;
    const peg = lathe([
      [0, 0], [10.4, 0], [10.4, 1.4], [9.6, 2.6], [8.2, 3.4], [7.0, 4.8], [6.2, 7.2], [r, 10.5], [r, L - 10.5], [5.9, L - 8.6],
      [6.9, L - 6.8], [7.6, L - 5.0], [7.9, L - 3.5], [7.7, L - 2.0], [6.9, L - 0.9], [5.0, L - 0.15], [0, L + 0.25],
    ], 56);
    peg.rotateX(Math.PI / 2);
    peg.rotateX(-HP.PEG.tilt);
    // The neck's top is at the band's bearing point where the band crosses it.
    const yAt = -r / Math.cos(HP.PEG.tilt) - (BEAR_Z - P.t) * Math.tan(HP.PEG.tilt);
    b.add(peg, bronze, xf({ p: [0, yAt, P.t] }));
    count(b.build(root, 'hook'));
  }

  // ---- the pair ---------------------------------------------------------------------------------------------------
  const swing = new THREE.Group();
  swing.position.copy(BEAR);
  root.add(swing);
  const pair = new THREE.Group();
  pair.quaternion.copy(PAIR_Q);
  swing.add(pair);

  await pause();
  // The band: two polished rails over a knitted canopy, bound at its edges, into a dark housing at each end; the stems
  // from the housings down to the yokes, and the yokes round the cups' tops.
  {
    const b = new Builder();
    const zAxis = new THREE.Vector3(0, 0, 1);
    for (const z of [-HP.RAIL_Z, HP.RAIL_Z]) {
      b.add(sweep(archPath(a.rx, a.ry, a.cy, () => 0, z, a.cy - 6), zAxis, 2.1, 2.7, 3, 16), polished);
    }
    const cp = archPath(a.crx, a.cry, a.cy, (x) => a.bear * Math.exp(-((x / a.bearW) ** 2)), 0, a.cy - 5, 128).map((p) => {
      // The path is the canopy's middle: the arch traced is its underside, the side that bears on the peg.
      const t = Math.atan2((p.y - a.cy) / a.cry, p.x / a.crx);
      const nx = Math.cos(t) / a.crx, ny = Math.sin(t) / a.cry, l = Math.hypot(nx, ny) || 1;
      return p.y > a.cy ? p.clone().add(new THREE.Vector3((nx / l) * 1.25, (ny / l) * 1.25, 0)) : p.clone().add(new THREE.Vector3(Math.sign(p.x) * 1.25, 0, 0));
    });
    b.add(sweep(cp, zAxis, HP.CANOPY_W, 1.25, 6, 20), canopy);
    for (const z of [-HP.CANOPY_W, HP.CANOPY_W]) b.add(sweep(cp.map((p) => new THREE.Vector3(p.x, p.y, z)), zAxis, 1.05, 1.35, 2, 10), piping);

    for (const s of [-1, 1]) {
      const X = s * a.rx;
      // The housing: a sculpted capsule in the cups' metal, narrow at its foot where the stem leaves, the rails and canopy in at
      // its top.
      const hs: Sec[] = [[2.9, 3.4, HP.STEM.top - 0.6], [4.6, 5.2, HP.STEM.top], [5.3, 10.5, HP.STEM.top + 2.2], [6.1, 17.5, HP.STEM.top + 9], [6.5, 22.6, HP.STEM.top + 20], [6.5, HOUSING_Z, a.cy - 3.2], [6.0, HOUSING_Z - 0.5, a.cy - 0.8], [4.6, HOUSING_Z - 1.8, a.cy + 0.6]];
      const hg = ringLoft(hs, 3, 64, 'top');
      b.add(hg, anod, xf({ p: [X, 0, 0] }));
      b.add(ringLoft([[6.5, HOUSING_Z, a.cy - 6.4], [7.0, HOUSING_Z + 0.5, a.cy - 6.0], [7.0, HOUSING_Z + 0.5, a.cy - 3.6], [6.5, HOUSING_Z, a.cy - 3.2]], 3, 64), polished, xf({ p: [X, 0, 0] }));
      // The slot the stem slides in, on the inner face, and its bushing at the foot.
      b.add(rbox(1.2, 20, 3.2, 0.5), ink, xf({ p: [X - s * 6.0, HP.STEM.top + 13, 0] }));
      b.add(lathe([[2.5, 0], [3.9, 0], [4.4, 0.6], [4.4, 1.8], [3.9, 2.3], [2.5, 2.3]], 32), copper, xf({ p: [X, HP.STEM.top - 2.2, 0] }));
      // The stem, pulled out by the cups' weight, its size marks cut along it.
      const st = HP.STEM, marks: [number, number][] = [[0, st.foot - 2], [st.r, st.foot - 2]];
      for (let k = 0; k < 4; k++) { const y = st.top - 9 - k * 7.5; marks.push([st.r, y - 0.45], [st.r - 0.3, y - 0.12], [st.r - 0.3, y + 0.12], [st.r, y + 0.45]); }
      marks.sort((p, q) => p[1] - q[1]);
      marks.push([st.r, st.top + 12], [0, st.top + 12]);
      b.add(lathe(marks, 24), polished, xf({ p: [X, 0, 0] }));
      // The yoke: a flat steel bow over the cup's top, down to a pivot either side.
      const pv = HP.PIVOT, yy = HP.YOKE_Y, rc = 11;
      const path: THREE.Vector3[] = [];
      const arm = pv.z;
      for (let k = 0; k <= 8; k++) path.push(new THREE.Vector3(s * pv.x, pv.y + 1 + ((yy - rc - pv.y - 1) * k) / 8, arm));
      for (let k = 1; k <= 10; k++) { const t = (k / 10) * (Math.PI / 2); path.push(new THREE.Vector3(s * pv.x, yy - rc + Math.sin(t) * rc, arm - rc + Math.cos(t) * rc)); }
      for (let k = 1; k <= 12; k++) path.push(new THREE.Vector3(s * pv.x, yy, arm - rc - ((2 * (arm - rc)) * k) / 12));
      for (let k = 1; k <= 10; k++) { const t = Math.PI / 2 + (k / 10) * (Math.PI / 2); path.push(new THREE.Vector3(s * pv.x, yy - rc + Math.sin(t) * rc, -arm + rc + Math.cos(t) * rc)); }
      for (let k = 1; k <= 8; k++) path.push(new THREE.Vector3(s * pv.x, yy - rc + ((pv.y + 1 - (yy - rc)) * k) / 8, -arm));
      b.add(sweep(path, new THREE.Vector3(1, 0, 0), 3.4, 2.2, 3.2, 14), steel);
      // Round ends at the pivots, a copper cap and screw on the outside of each.
      for (const zs of [-1, 1]) {
        const zo = zs * (arm + 2.2);
        const m = xf({ p: [s * pv.x, pv.y, zo], r: [zs > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0] });
        b.add(lathe([[0, -4.4], [5.2, -4.4], [5.6, -3.6], [5.6, -1.0], [5.0, 0], [0, 0]], 40), steel, m);
        b.add(lathe([[0, 0], [3.8, 0], [3.8, 0.9], [3.2, 1.6], [0, 1.9]], 32), copper, m);
        const sc = screw(1.9);
        b.add(sc.slot, ink, xf({ p: [s * pv.x, pv.y, zo + zs * 1.95], r: [zs > 0 ? 0 : Math.PI, 0, 0.7] }));
      }
      // The collar where the stem meets the yoke.
      b.add(lathe([[2.4, 0], [4.6, 0], [5.2, 0.8], [5.2, 4.2], [4.2, 5.6], [2.4, 6.0]], 36), copper, xf({ p: [s * pv.x, yy + 1.6, 0] }));
    }
    for (const m of count(b.build(pair, 'band'))) if (m.material === ink) m.castShadow = false;
    const serial = serialStrip();
    pair.add(serial);
    tris += (serial.geometry.index?.count ?? 0) / 3;
  }

  await pause();
  // ---- the cups ---------------------------------------------------------------------------------------------------
  const cups: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const c = HP.CUP, pv = HP.PIVOT;
    const pivot = new THREE.Group();
    pivot.position.set(s * pv.x, pv.y, 0);
    pair.add(pivot);
    const body = new THREE.Group();
    body.matrix.copy(cupMatrix(s)).premultiply(new THREE.Matrix4().makeTranslation(-s * pv.x, -pv.y, 0));
    body.matrix.decompose(body.position, body.quaternion, body.scale);
    pivot.add(body);
    const b = new Builder();
    // In the cup's own space its axis is z, out from the head, and its face lies in xy.
    const toCup = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    b.add(ringLoft(SHELL, c.n, 112), anod, toCup);
    b.add(ringLoft(FACE, c.n, 112, 'top'), faceSteel, toCup);
    // The copper ring set into the face.
    b.add(ringLoft([[23.9, 28.9, 21.4], [23.6, 28.6, 22.25], [22.3, 27.3, 22.25], [22.0, 27.0, 21.4]], c.n, 112), copper, toCup);
    b.add(ringLoft(CUSHION, 3.0, 112), cushion, toCup);
    b.add(capDown(22.4, 28.4, 3.0, -6.0, 64), cloth, toCup);
    // The bosses the yoke's pivots turn in, on the cup's flanks.
    for (const xs of [-1, 1]) {
      b.add(lathe([[0, 0], [4.6, 0], [4.6, 1.6], [4.0, 2.9], [0, 2.9]], 32), steel, xf({ p: [xs * 36.6, pv.y - c.y, pv.x - c.x], r: [0, 0, xs > 0 ? -Math.PI / 2 : Math.PI / 2] }));
    }
    if (s < 0) {
      // The crown and a button on the top edge toward the front, on the cup that shows its face.
      const front = 1;
      b.add(knurled(3.3, 4.6, 18, 0.1), copper, xf({ p: [front * 19, 40.2, 16] }));
      b.add(lathe([[0, 0], [3.0, 0], [3.3, 0.5], [3.3, 1.0], [0, 1.0]], 24), copper, xf({ p: [front * 19, 42.3, 16] }));
      b.add(lathe([[0, 2.1], [1.6, 2.0], [2.6, 1.5], [3.0, 0.9], [3.0, 0], [0, 0]].reverse() as [number, number][], 24), copper, xf({ p: [front * 19, 42.7, 16] }));
      b.add(rbox(8, 3, 3.6, 1.4), polished, xf({ p: [front * 5, 41.9, 16] }));
    }
    for (const m of count(b.build(body, s < 0 ? 'cupL' : 'cupR'))) if (m.material === ink) m.castShadow = false;
    cups.push(pivot);
  }

  // ---- the wall -------------------------------------------------------------------------------------------------
  const wallGeo = new THREE.PlaneGeometry(FRAME_H * 2.2, FRAME_H * 1.5);
  const wallC = { value: new THREE.Vector2(0, MID_Y) };
  const wall = new THREE.Mesh(wallGeo, wallMaterial(wallC, [165, 210]));
  wall.position.set(0, MID_Y, 0);
  wall.receiveShadow = true;
  wall.userData.noAO = true;
  wall.userData.noWire = true;
  wall.name = 'wall';
  root.add(wall);
  tris += 2;

  return { root, swing, cups: cups as [THREE.Group, THREE.Group], wall, wallC, look, tris };
}
