import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin, shade } from '../../../../world/surface';
import { PLANET } from '../../layout';
import { BARE } from './bare';
import { D2R } from './kit';

// The ground's two programs, and the one its small moving lights are drawn with. The floor draws everything that is
// the ground itself: its top, worked out per pixel from where a point is on the map; the faces where it broke, which
// show the crust in section; the crack's floor; and the rock under the torn edge. The made program draws everything
// built on it, each thing saying what it is made of in its cell attribute (KIND in ./kit.ts).

export interface GroundUniforms { uT: { value: number }; uCore: { value: number } }

// The palette's lights as a ramp, ember to pale, in linear values.
const RAMP = `vec3 gRamp(float t){
  vec3 e = ${lin(hex('ember'))}, f = ${lin(hex('flame'))}, h = ${lin(hex('hot'))}, p = ${lin(hex('pale'))};
  t = clamp(t, 0.0, 1.0);
  return t < 0.333 ? mix(e, f, t * 3.0) : t < 0.667 ? mix(f, h, t * 3.0 - 1.0) : mix(h, p, t * 3.0 - 2.0);
}`;

// A bump worked out from a height in the fragment, in view space, as three's own bump map does it.
const BUMP = `vec3 gBump(vec3 n, float h, float k){
  vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
  float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 g = sign(det) * (hx * r1 + hy * r2);
  vec3 m = abs(det) * n - g * k;
  return dot(m, m) > 1e-20 ? normalize(m) : n;
}`;

// A line of a width at a distance, its light kept as it is when it is finer than a pixel; the inside of a band; a hash.
const LINES = `float gLine(float d, float w){ float a = max(fwidth(d), 1e-4); return (1.0 - smoothstep(w * 0.5 - a, w * 0.5 + a, abs(d))) * min(1.0, w / a); }
float gIn(float d, float w){ float a = max(fwidth(d), 1e-4); return 1.0 - smoothstep(w * 0.5 - a, w * 0.5 + a, abs(d)); }
float gW(float d){ float a = max(fwidth(d), 1e-3); return smoothstep(-a, a, d); }
float gHash(vec2 q){ return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }
vec2 gTurn(vec2 p, float deg){ float a = radians(deg), c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
// Slabs on a grid: a tone for each, and the joints between them, gone to nothing before they are finer than a pixel.
vec2 gSlabs(vec2 q, vec2 size, float jw){
  vec2 id = floor(q / size), f = abs(fract(q / size) - 0.5) * size, w = max(fwidth(q), vec2(1e-3));
  float j = max(smoothstep(size.x * 0.5 - jw - w.x, size.x * 0.5 - jw + w.x, f.x), smoothstep(size.y * 0.5 - jw - w.y, size.y * 0.5 - jw + w.y, f.y));
  return vec2(gHash(id), j * min(1.0, jw * 2.0 / max(w.x, w.y)));
}`;

// How much of the room and the lamp a surface reflects, by the fragment. At a grazing view every surface, rough or
// not, took the whole sheen and read as one pale deck: earth and soot reflect little of it.
function specular(m: THREE.MeshStandardMaterial): void {
  const own = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    own.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', 'radiance *= gSpec;\nreflectedLight.directSpecular *= gSpec;\n#include <lights_fragment_end>');
  };
}

const f = (v: number) => v.toFixed(2);
// A place on the dome, given as a point of the frame, back on the map: x and z on the map, y the height over the
// ground there.
const MAP_OF = `vec3 gMapOf(vec3 o){
  vec3 d = o - vec3(0.0, -${f(PLANET.r)}, 0.0);
  float h = length(d.xz), a = atan(h, d.y);
  vec2 dir = h > 1e-4 ? d.xz / h : vec2(0.0, 1.0);
  return vec3(dir.x * a * ${f(PLANET.r)}, length(d) - ${f(PLANET.r)}, dir.y * a * ${f(PLANET.r)});
}`;

// The metals, each its own value and finish: gold, the palette's hue between copper-light and hot, never a yellow
// brass; copper; bronze, darker and browner; and dark bronze.
const GOLD = 0xf0ad66;

// What a made thing is drawn as, by its cell attribute (KIND in ./kit.ts).
export function madeMaterial(u: GroundUniforms, name: string): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
  m.name = name;
  m.userData.uniforms = u;
  shade(m, 'ground-made', {
    vhead: 'attribute vec4 cell;\nvarying vec4 vCell;\nvarying vec2 vLoc;',
    vert: 'vCell = cell; vLoc = uv;',
    head: `varying vec4 vCell; varying vec2 vLoc; uniform float uT; uniform float uCore; float gRough, gMetal, gSpec, gCut; vec3 gEmi;
${RAMP}
${BUMP}
${LINES}
${MAP_OF}
float gBox(vec2 p, vec2 b){ vec2 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
float gAlmond(vec2 p, float w, float h){ float rr = (w * w + h * h) / (2.0 * h), d = rr - h; return max(length(p - vec2(0.0, d)) - rr, length(p + vec2(0.0, d)) - rr); }
// The marks, as the Sun stone's glyphs are made: abstract, none of them a letter or a number. a and b run -1 to 1.
float gGlyph(float a, float b, float id){
  float k = mod(id, 10.0), x = abs(a), d;
  if (k < 0.5) d = abs(length(vec2(a, b)) - 0.5) - 0.15;
  else if (k < 1.5) d = min(max(abs(b - 0.5) - 0.14, x - 0.64), max(abs(x - 0.46 * step(0.23, x)) - 0.12, abs(b + 0.1) - 0.5));
  else if (k < 2.5) d = min(max(abs(a + 0.4) - 0.15, abs(b) - 0.66), max(abs(b + 0.51) - 0.15, x - 0.56));
  else if (k < 3.5) d = min(abs(gAlmond(vec2(a, b), 0.7, 0.38)) - 0.1, length(vec2(a, b)) - 0.17);
  else if (k < 4.5) d = min(length(vec2(a, b - 0.3)) - 0.27, max(abs(b + 0.46) - 0.14, x - 0.6));
  else if (k < 5.5) d = min(max(abs(b) - 0.13, x - 0.62), min(max(abs(a - 0.49) - 0.13, abs(b - 0.32) - 0.44), max(abs(a + 0.49) - 0.13, abs(b - 0.32) - 0.44)));
  else if (k < 6.5) d = max(length(vec2(a, b)) - 0.64, 0.5 - length(vec2(a, b - 0.3)));
  else if (k < 7.5) d = min(max(abs(b - 0.46) - 0.14, x - 0.62), max(x - 0.14, abs(b + 0.1) - 0.56));
  else if (k < 8.5) d = min(abs(max(x, abs(b)) - 0.52) - 0.12, length(vec2(a, b)) - 0.16);
  else d = max(min(abs(x * 0.9 - b - 0.28), abs(x * 0.9 - b + 0.34)) * 0.74 - 0.11, max(x, abs(b)) - 0.68);
  return d;
}
// Pale warm stone in courses, each block its own tone, the joints fine and dark. On a face that looks up, the stone
// is laid in slabs on the map.
vec3 gStone(vec3 base, float px, float up){
  vec2 q = up > 0.7 ? gMapOf(vObj).xz : vLoc;
  float course = floor(q.y / 3.1), off = gHash(vec2(course, 3.0)) * 9.0;
  float blk = floor((q.x + off) / 8.5);
  float tone = gHash(vec2(blk, course));
  vec2 w = max(fwidth(q), vec2(1e-3));
  float jx = abs(fract((q.x + off) / 8.5) - 0.5) * 8.5, jy = abs(fract(q.y / 3.1) - 0.5) * 3.1;
  float joint = max(smoothstep(4.15 - w.x, 4.15 + w.x, jx), smoothstep(1.45 - w.y, 1.45 + w.y, jy)) * min(1.0, 0.25 / max(w.x, w.y));
  float n = wFbm(vObj * 0.3) * (1.0 - smoothstep(1.0, 3.0, px * 0.3));
  vec3 c = base * (0.72 + 0.4 * tone) * (0.88 + 0.24 * n) * (1.0 - 0.45 * joint);
  // Weathered: stains run down from every ledge.
  c *= 1.0 - 0.28 * smoothstep(0.5, 0.9, wNoise(vec3(q.x * 0.3, q.y * 0.05, 1.0)));
  gCut = -joint * 0.25;
  return c;
}`,
    color: `{
  float kd = floor(vCell.x + 0.5);
  float px = length(fwidth(vObj));
  float fade = 1.0 - smoothstep(1.0, 3.0, px * 0.25);
  float n = mix(0.5, wFbm(vObj * 0.25), fade);
  vec3 radial = normalize(vObj - vec3(0.0, -${f(PLANET.r)}, 0.0));
  float up = dot(normalize(vObjN + vec3(0.0, 1e-5, 0.0)), radial);
  vec3 c = vec3(0.0); gRough = 0.6; gMetal = 0.0; gEmi = vec3(0.0); gSpec = 1.0; gCut = 0.0;
  if (kd < 0.5) { c = gStone(${lin(0x6a5946)}, px, up); gRough = 0.72; gSpec = 0.45; }
  else if (kd < 1.5) { c = ${lin(0x2c2b29)} * (0.9 + 0.2 * n); gRough = 0.34 + 0.08 * n; gMetal = 0.85; }
  else if (kd < 2.5) { c = ${lin(hex('copper'))} * (0.9 + 0.14 * n); gRough = 0.17 + 0.06 * n; gMetal = 1.0; }
  else if (kd < 3.5) { c = ${lin(0x131211)}; gRough = 0.9; gSpec = 0.25; }
  else if (kd < 4.5) {
    float w = vCell.w, mode = floor(w), ph = fract(w) * 6.2832, k = vCell.z;
    if (mode > 0.5 && mode < 1.5) k *= 0.82 + 0.18 * sin(uT * 0.9 + ph);
    if (mode > 1.5) k *= 0.25 + 0.75 * smoothstep(0.55, 0.95, sin(uT * 0.55 + ph));
    c = ${lin(0x1a1714)}; gRough = 0.5; gEmi = gRamp(vCell.y) * k; gSpec = 0.4;
  }
  else if (kd < 5.5) {
    // Marks cut in rows and columns over a panel, centered on the panel's own middle.
    c = gStone(${lin(0x6a5946)}, px, 0.0); gRough = 0.72; gSpec = 0.45;
    const float P = 3.2;
    vec2 q = vLoc / P;
    vec2 id = floor(q + 0.5), cq = (q - id) / 0.42;
    float d = gGlyph(cq.x, cq.y, floor(mod(id.x * 7.0 + id.y * 3.0 + vCell.y * 13.0, 10.0) + 0.5)) * P * 0.42;
    float on = step(abs(id.x), vCell.z) * step(abs(id.y), vCell.w);
    float a = max(fwidth(d), 1e-3), fadeG = 1.0 - smoothstep(0.35, 0.9, a);
    float cut = (1.0 - smoothstep(-a, a, d)) * on;
    gCut = cut * fadeG;
    c *= mix(1.0, mix(0.8, 0.36, fadeG), cut);
  }
  else if (kd < 6.5) { c = ${lin(hex('bronze'))} * (0.9 + 0.18 * n); gRough = 0.27 + 0.07 * n; gMetal = 1.0; }
  else if (kd < 7.5) { c = ${lin(0x0d0c0b)}; gRough = 0.06; gMetal = 0.0; gEmi = gRamp(0.3) * vCell.y; }
  else if (kd < 8.5) {
    vec2 q = vLoc;
    vec2 cellId = floor(vec2(q.x / 14.0, q.y / 5.2));
    float tone = gHash(cellId);
    vec2 qq = abs(fract(vec2(q.x / 14.0, q.y / 5.2)) - 0.5) * vec2(14.0, 5.2);
    vec2 w = max(fwidth(q), vec2(1e-3));
    float joint = max(smoothstep(6.85 - w.x, 6.85 + w.x, qq.x), smoothstep(2.45 - w.y, 2.45 + w.y, qq.y)) * min(1.0, 0.25 / max(w.x, w.y));
    c = ${lin(0x2a2826)} * (0.88 + 0.24 * tone) * (1.0 - 0.55 * joint) * (0.92 + 0.16 * n);
    gRough = 0.4 + 0.12 * tone; gSpec = 0.7;
  }
  else if (kd < 9.5) { c = ${lin(GOLD)} * (0.94 + 0.08 * n); gRough = 0.12 + 0.04 * n; gMetal = 1.0; }
  else if (kd < 10.5) { c = ${lin(hex('bronze-deep'))} * 1.2 * (0.9 + 0.2 * n); gRough = 0.33 + 0.07 * n; gMetal = 1.0; }
  else if (kd < 11.5) {
    // Upright leaves round a cornice, each a shallow channel, gone to their average before they are finer than a pixel.
    c = ${lin(hex('bronze'))} * (0.9 + 0.16 * n); gRough = 0.24 + 0.05 * n; gMetal = 1.0;
    float along = vLoc.x / 2.4, w = fwidth(along);
    float leaf = 1.0 - pow(abs(fract(along) - 0.5) * 2.0, 2.0), keep = 1.0 - smoothstep(0.25, 0.6, w);
    gCut = -(leaf - 0.66) * keep * 2.0;
    c *= mix(1.0, 0.8 + 0.2 * leaf, keep);
  }
  else if (kd < 12.5) {
    // Broken rock: dark, near neutral, its faces each their own tone, paler where they look up and dust lies.
    float tone = wNoise(floor(vObj * 0.45) + 3.0);
    c = mix(${lin(0x26231f)}, ${lin(0x3b352e)}, tone) * (0.85 + 0.3 * n);
    c *= 1.0 + 0.45 * smoothstep(0.2, 0.9, up);
    gRough = 0.92; gSpec = 0.2;
  }
  else if (kd < 13.5) {
    // Dark granite, polished: near black, a fine grain of paler crystals, and it takes the room's light.
    float g = wNoise(vObj * 2.3);
    c = ${lin(0x1b1a19)} * (0.85 + 0.3 * mix(0.5, g, fade));
    c += ${lin(0x4a4038)} * smoothstep(0.78, 0.86, g) * fade * 0.6;
    gRough = 0.2 + 0.08 * n; gSpec = 1.0;
  }
  else if (kd < 14.5) {
    // Bark, grey and split along the trunk.
    float split = gLine(fract(vLoc.x * 1.7 + wNoise(vObj * 0.4) * 0.6) - 0.5, 0.18) * fade;
    c = ${lin(0x3a342e)} * (0.8 + 0.35 * n) * (1.0 - 0.5 * split);
    gRough = 0.95; gSpec = 0.15; gCut = split * 0.6;
  }
  else if (kd < 15.5) {
    // Earth with stones in it.
    float st = smoothstep(0.62, 0.72, wNoise(vObj * 1.6));
    c = mix(${lin(0x2a2018)}, ${lin(0x55504a)}, st) * (0.8 + 0.3 * n);
    gRough = 0.97; gSpec = 0.12;
  }
  else {
    // Metal polished to a mirror, as the pools are: gold, copper or bronze by its y, with a slow broad ripple running
    // through it so what it reflects breaks into moving shapes, bright beside dark.
    float m = vCell.y;
    c = m < 0.5 ? ${lin(GOLD)} : m < 1.5 ? ${lin(hex('copper'))} : ${lin(hex('bronze-deep'))} * 1.8;
    gMetal = 1.0; gRough = 0.035; gSpec = 1.0;
    gCut = ((wNoise(vObj * 0.12 + vec3(uT * 0.05, 0.0, uT * 0.03)) - 0.5) * 0.45 + (wNoise(vObj * 0.31 - vec3(0.0, 0.0, uT * 0.07)) - 0.5) * 0.5) * fade;
  }
  diffuseColor.rgb = c;
}`,
    normal: 'if (gCut != 0.0) normal = gBump(normal, -gCut * 0.35, 0.0015);',
    rough: 'roughnessFactor = gRough;',
    metal: 'metalnessFactor = gMetal;',
    emissive: 'totalEmissiveRadiance = gEmi;',
  });
  specular(m);
  return m;
}

// The floor's plan, as the shader needs it.
export interface FloorPlan {
  plaza: number; rings: readonly number[]; road: number; avenues: readonly number[]; city: number; mapR: number; tall: number;
  squares: [number, number, number, number][];
  // Each place another part makes its own floor in, and each stretch of open ground: from radius x to y, from
  // bearing z to w.
  zones: { procession: [number, number, number, number]; temple: [number, number, number, number]; monument: [number, number, number, number] };
  forest: [number, number, number, number];
  dunes: [number, number, number, number];
  open: [number, number, number, number][];
}

// The floor. Its attributes: plan, where on the map a point was before the land broke, how deep under the land's top
// it is (on the top itself, how bare the ground is), and what it is (0 the top, 1 a broken face, 2 the crack's floor,
// 3 the rock under the torn edge); aux, how high the ground stands there as a share of TALL, how far out across the
// margin, and how much of the stream's light shows there.
export function floorMaterial(u: GroundUniforms, map: THREE.Texture, plan: FloorPlan): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0 });
  m.name = 'ground-floor';
  m.userData.uniforms = { ...u, uMap: { value: map } };
  const rings = plan.rings.map(f).join(', ');
  const aves = plan.avenues.map((a) => (a * D2R).toFixed(5)).join(', ');
  const v4 = (q: readonly number[]) => `vec4(${q.map(f).join(', ')})`;
  shade(m, 'ground-floor', {
    vhead: 'attribute vec4 plan;\nattribute vec3 aux;\nvarying vec4 vPlan;\nvarying vec3 vAux;',
    vert: 'vPlan = plan; vAux = aux;',
    head: `varying vec4 vPlan; varying vec3 vAux; uniform float uT; uniform float uCore; uniform sampler2D uMap; float gRough, gSpec, gMetal, gH; vec3 gEmi;
${RAMP}
${LINES}
${BUMP}
const float RINGS[${plan.rings.length}] = float[](${rings});
const float AVES[${plan.avenues.length}] = float[](${aves});
const vec4 SQUARES[${plan.squares.length}] = vec4[](${plan.squares.map(v4).join(', ')});
const vec4 OPEN[${plan.open.length}] = vec4[](${plan.open.map(v4).join(', ')});
// The edges of the cells of a cracked pavement: 0 on a crack, rising into each slab; and each slab's own number.
vec2 gCells(vec2 q){
  vec2 i = floor(q), f = fract(q);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y)), c = o + 0.15 + 0.7 * vec2(gHash(i + o), gHash(i + o + 17.3)) - f;
    float d = dot(c, c);
    if (d < d1) { d2 = d1; d1 = d; id = gHash(i + o + 5.1); } else if (d < d2) d2 = d;
  }
  return vec2(sqrt(d2) - sqrt(d1), id);
}
// How far inside a stretch of the ground a point is: from radius x to y, from bearing z to w. Below 0 outside.
float gSector(float r, float deg, vec4 q){
  float da = mod(deg - q.z + 720.0, 360.0), span = mod(q.w - q.z + 720.0, 360.0);
  float side = da <= span ? min(da, span - da) * r * 0.017453 : -min(da - span, 360.0 - da) * r * 0.017453;
  return min(side, min(r - q.x, q.y - r));
}`,
    color: `{
  float what = floor(vPlan.w + 0.5);
  vec2 p = vPlan.xy; float r = length(p), deg = mod(degrees(atan(p.x, p.y)) + 360.0, 360.0);
  float px = max(length(fwidth(p)), 1e-3);
  float fine = 1.0 - smoothstep(0.35, 1.0, px * 0.6), finer = 1.0 - smoothstep(0.35, 1.0, px * 2.5);
  float h = vAux.x, tOut = vAux.y, glow = vAux.z;
  vec3 radial = normalize(vObj - vec3(0.0, -${f(PLANET.r)}, 0.0));
  float slope = 1.0 - clamp(dot(normalize(vObjN + vec3(0.0, 1e-5, 0.0)), radial), 0.0, 1.0);
  float steep = smoothstep(0.02, 0.1, slope);
  vec3 c; vec3 emi = vec3(0.0);
  gRough = 0.92; gSpec = 0.22; gMetal = 0.0; gH = 0.0;
  if (what < 0.5) {
    vec4 mp = texture2D(uMap, p / ${f(2 * plan.mapR)} + 0.5) * step(r, ${f(plan.mapR - 2)});
    float old = smoothstep(0.35, 0.8, mp.g), hh = h * ${f(plan.tall)};
    float n0 = wFbm(vec3(p * 0.011, 1.0)), n1 = wFbm(vec3(gTurn(p, 37.0) * 0.045, 2.0));
    float n2 = mix(0.5, wFbm(vec3(gTurn(p, 71.0) * 0.21, 3.0)), fine), n3 = mix(0.5, wNoise(vec3(gTurn(p, 23.0) * 0.9, 4.0)), finer);
    float edgeN = wNoise(vec3(p * 0.05, 8.0));
    float jungle = smoothstep(-6.0, 6.0, gSector(r, deg, ${v4(plan.forest)}) + (edgeN - 0.5) * 8.0);
    float dunes = smoothstep(-6.0, 6.0, gSector(r, deg, ${v4(plan.dunes)}) + (edgeN - 0.5) * 8.0);

    // The bare ground: bedrock under a skin of dust, in the site's warm darks. Its beds are the terraces the ground is
    // laid in, each its own tone, the edge of each a little paler where it was worn; the rock broken into slabs along
    // its joints; dust lying in the hollows and on the treads of the terraces; dark varnish in patches; grit.
    float dust0 = smoothstep(0.4, 0.7, 1.0 - n1);
    float bedc = (hh + 0.02 * p.x - 0.01 * p.y) / ${f(BARE.bed)}, bedK = floor(bedc), bedT = fract(bedc);
    float tone = mix(gHash(vec2(bedK, 3.0)), gHash(vec2(bedK + 1.0, 3.0)), smoothstep(0.6, 1.0, bedT));
    vec3 rock = mix(${lin(0x110f0d)}, ${lin(0x231e1a)}, smoothstep(0.2, 0.8, tone * 0.6 + n1 * 0.4)) * (0.82 + 0.3 * n2);
    const float cs = 7.5;
    vec2 cells = gCells(gTurn(p, 17.0) / cs + vec2(n1, n0) * 0.9), big = gCells(gTurn(p, 71.0) / 19.0 + vec2(n0, n1) * 0.7);
    float which = smoothstep(0.4, 0.6, n0);
    float joint = max((1.0 - smoothstep(0.0, 0.07 + px / cs, cells.x)) * (1.0 - which), (1.0 - smoothstep(0.0, 0.03 + px / 19.0, big.x))) * fine * smoothstep(0.25, 0.6, n1 + 0.3 * (1.0 - dust0));
    cells.y = mix(cells.y, big.y, which);
    rock *= (0.88 + 0.22 * cells.y) * (1.0 - 0.55 * joint);
    float riser = smoothstep(0.03, 0.12, slope);
    rock = mix(rock, ${lin(0x2e2620)} * (0.85 + 0.3 * n3), riser * 0.35);
    float varnish = smoothstep(0.58, 0.78, wFbm(vec3(gTurn(p, 63.0) * vec2(0.05, 0.16), 21.0)));
    rock = mix(rock, ${lin(0x0f0c0a)}, varnish * 0.6);
    rock *= 0.7 + 0.5 * smoothstep(0.3, 0.7, wFbm(vec3(p * 0.006, 31.0)));
    float dust = smoothstep(0.42, 0.7, (1.0 - n1) * 0.7 + (1.0 - riser) * 0.25 + n0 * 0.2) * (1.0 - riser);
    vec3 dustC = ${lin(0x30271f)} * (0.78 + 0.35 * n3) * (0.9 + 0.2 * n2);
    rock = mix(rock, dustC, dust * 0.75);
    float grit = smoothstep(0.7, 0.78, mix(0.5, wNoise(vec3(gTurn(p, 9.0) * 0.8, 14.0)), finer));
    rock = mix(rock, ${lin(0x463b30)}, grit * 0.35 * (1.0 - dust * 0.5));
    // The old roads: setts sunk in the dust, broken, and lost under it toward their ends.
    vec2 setts0 = gSlabs(gTurn(p, deg), vec2(1.6, 1.0), 0.08);
    vec3 oldC = ${lin(0x231f1b)} * (0.8 + 0.4 * mix(0.5, setts0.x, finer)) * (1.0 - 0.3 * setts0.y * finer);
    float lost = smoothstep(0.35, 0.75, n2 * 0.6 + n1 * 0.4);
    rock = mix(rock, oldC, old * (1.0 - lost) * (1.0 - joint * 0.5));
    // The joints as grooves for the light, broader than the dark line drawn in them: a groove as fine as the line
    // broke into dashes where the bump was worked out across a pixel.
    float groove = max((1.0 - smoothstep(0.0, 0.16, cells.x)) * (1.0 - which), 1.0 - smoothstep(0.0, 0.08, big.x)) * fine * fine;
    float rh = (n2 - 0.5) * 0.7 + (n3 - 0.5) * 0.35 + dust * 0.2 - groove * 0.9 - old * setts0.y * 0.3 * finer;

    // Under the jungle, a dark floor of earth and litter; under the dunes, a plain of their own sand.
    vec3 litter = mix(${lin(0x18120d)}, ${lin(0x2a1c12)}, smoothstep(0.35, 0.65, n1)) * (0.8 + 0.4 * n3);
    vec3 sand = mix(${lin(0x5d4a33)}, ${lin(0x705a3e)}, n1) * (0.88 + 0.2 * n3);
    c = mix(mix(rock, sand, dunes), litter, jungle);
    gH = mix(rh, (n3 - 0.5) * 0.4, max(jungle, dunes));
    gRough = 0.94; gSpec = mix(0.1, 0.06, jungle);

    // The city: streets of dark setts, walks of pale slabs either side, a yard round every building paved in great
    // slabs inside a border course, and between them service courts of small setts with planted beds in rows. The
    // paving gives way to the land in a ragged edge at the city's rim.
    float wedge = 0.0;
    for (int i = 0; i < ${plan.open.length}; i++) wedge = max(wedge, smoothstep(-3.0, 4.0, gSector(r, deg, OPEN[i]) + (edgeN - 0.5) * 9.0));
    float city = (1.0 - smoothstep(${f(plan.city - 4)}, ${f(plan.city + 6)}, r - (edgeN - 0.5) * 10.0)) * (1.0 - jungle) * (1.0 - dunes) * (1.0 - wedge);
    if (city > 0.0) {
      vec2 small = gSlabs(gTurn(p, deg), vec2(2.2, 2.2), 0.09);
      vec3 cc = mix(${lin(0x181512)}, ${lin(0x221d18)}, small.x * fine) * (1.0 - 0.3 * small.y) * (0.9 + 0.2 * n2);
      vec2 beds = abs(fract(gTurn(p, deg) / 16.0) - 0.5) * 16.0;
      float bed = (1.0 - smoothstep(2.6, 2.6 + fwidth(beds.x) * 2.0, beds.x)) * (1.0 - smoothstep(4.6, 4.6 + fwidth(beds.y) * 2.0, beds.y));
      cc = mix(cc, ${lin(0x1d1610)} * (0.7 + 0.6 * n3), bed);
      float ch = -small.y * 0.35 * fine - bed * 0.4;
      float yard = smoothstep(0.3, 0.45, mp.r), rim = yard * (1.0 - smoothstep(0.7, 0.85, mp.r));
      vec2 ys = gSlabs(gTurn(p, deg), vec2(6.0, 6.0), 0.14);
      cc = mix(cc, ${lin(0x221f1c)} * (0.82 + 0.3 * ys.x * fine) * (1.0 - 0.35 * ys.y) * (0.92 + 0.16 * n2), yard);
      cc = mix(cc, ${lin(0x15120f)}, rim * 0.8);
      ch = mix(ch, -ys.y * 0.5, yard);
      float onRoad = 0.0, walk = 0.0;
      // No street runs round the city's rim: a boulevard out at the margin would be a ring round the world.
      for (int i = 0; i < ${plan.rings.length}; i++) {
        if (RINGS[i] > ${f(plan.city - 12)}) continue;
        float d = r - RINGS[i];
        onRoad = max(onRoad, gIn(d, ${f(plan.road)}));
        walk = max(walk, gIn(abs(d) - ${f(plan.road / 2 + 2.2)}, 4.4));
      }
      for (int i = 0; i < ${plan.avenues.length}; i++) {
        vec2 dir = vec2(sin(AVES[i]), cos(AVES[i]));
        float t = dot(p, dir), d = dir.x * p.y - dir.y * p.x;
        float span = step(${f(plan.plaza)}, t) * (i == 0 ? 0.0 : 1.0);
        onRoad = max(onRoad, gIn(d, ${f(plan.road)}) * span);
        walk = max(walk, gIn(abs(d) - ${f(plan.road / 2 + 2.2)}, 4.4) * span);
      }
      walk *= 1.0 - onRoad;
      vec2 setts = gSlabs(gTurn(p, deg), vec2(1.6, 1.0), 0.08);
      vec3 street = ${lin(0x121110)} * (0.82 + 0.35 * mix(0.5, setts.x, finer)) * (1.0 - 0.25 * setts.y * finer) * (0.9 + 0.2 * n2);
      vec2 ws = gSlabs(vec2(atan(p.x, p.y) * r, r), vec2(4.0, 2.2), 0.12);
      vec3 walkC = ${lin(0x2a2622)} * (0.84 + 0.24 * ws.x * fine) * (1.0 - 0.32 * ws.y);
      cc = mix(cc, walkC, walk);
      cc = mix(cc, street, onRoad);
      ch = mix(ch, -ws.y * 0.5, walk);
      ch = mix(ch, -setts.y * 0.3 * finer, onRoad);
      float sq = 0.0;
      for (int i = 0; i < ${plan.squares.length}; i++) sq = max(sq, gW(gSector(r, deg, SQUARES[i])));
      vec2 ss = gSlabs(gTurn(p, deg), vec2(4.0, 4.0), 0.12);
      float band = gIn(mod(gTurn(p, deg).y, 24.0) - 12.0, 2.0);
      cc = mix(cc, mix(${lin(0x2a2622)}, ${lin(0x1a1714)}, band) * (0.86 + 0.2 * ss.x * fine) * (1.0 - 0.3 * ss.y), sq);
      float inPlaza = 1.0 - smoothstep(${f(plan.plaza - 1)}, ${f(plan.plaza)}, r);
      float joints = max(gLine(fract(r / 6.0 + 0.5) - 0.5, 0.06), gLine(fract(atan(p.x, p.y) * 7.639 + 0.5) - 0.5, 0.05) * step(30.0, r));
      cc = mix(cc, ${lin(0x2c2824)} * (1.0 - 0.35 * joints * fine) * (0.92 + 0.12 * n2) * (1.0 - 0.25 * gIn(mod(r, 12.0) - 6.0, 2.0)), inPlaza);
      emi += gRamp(0.62) * (gLine(r - 46.0, 0.8) + gLine(r - ${f(plan.plaza - 6)}, 0.6)) * inPlaza * 0.6;
      float own = max(max(gW(gSector(r, deg, ${v4(plan.zones.temple)})), gW(gSector(r, deg, ${v4(plan.zones.monument)}))), gW(gSector(r, deg, ${v4(plan.zones.procession)})));
      vec2 os = gSlabs(gTurn(p, deg), vec2(9.0, 6.0), 0.15);
      cc = mix(cc, ${lin(0x221e1b)} * (0.84 + 0.24 * os.x * fine) * (1.0 - 0.3 * os.y) * (0.9 + 0.2 * n2), own * (1.0 - onRoad));
      c = mix(c, cc, city);
      gH = mix(gH, ch, city);
      gRough = mix(gRough, mix(0.8, 0.66, onRoad), city);
      gSpec = mix(gSpec, mix(0.14, 0.24, onRoad), city);
    }
    // What the breaking did to the top of a block: churned soil and broken stone, more of it toward the edge.
    float churn = smoothstep(0.0, 0.6, tOut) * smoothstep(0.45, 0.7, wFbm(vec3(p * 0.09, 11.0)));
    c = mix(c, ${lin(0x2b221a)} * (0.75 + 0.5 * n3), churn * 0.7);
  } else {
    // The crust in section: the land's dark soil, the paler subsoil under it full of stones, then beds of rock,
    // broken by their own joints, a thin seam of copper, and darker rock down to where the stream's light comes up.
    float d = vPlan.z;
    vec3 o = vObj;
    float dd = d + 1.0 * (wNoise(o * 0.09) - 0.5) * smoothstep(1.0, 3.0, d);
    float block = wNoise(floor(o * vec3(0.2, 0.55, 0.2)) + 7.0);
    float n = wNoise(o * 1.1);
    if (dd < 1.3) c = ${lin(0x1b1510)} * (0.8 + 0.4 * n);
    else if (dd < 4.0) c = mix(${lin(0x33281e)}, ${lin(0x4a443e)}, smoothstep(0.6, 0.7, wNoise(o * 0.8))) * (0.8 + 0.3 * n);
    else if (dd < 8.0) c = ${lin(0x28231f)} * (0.78 + 0.35 * block) * (1.0 - 0.25 * gLine(fract(dd / 1.4) - 0.5, 0.12) * fine);
    else if (dd < 9.6) { c = ${lin(0xf0ad66)}; gMetal = 1.0; gRough = 0.1; gSpec = 1.0; }
    else if (dd < 14.0) c = ${lin(0x2d2a27)} * (0.8 + 0.4 * block);
    else c = ${lin(0x1c1a18)} * (0.8 + 0.4 * block);
    if (what > 1.5 && what < 2.5) {
      float lump = wNoise(o * 0.35 + 2.0);
      c = mix(${lin(0x161413)}, ${lin(0x2b2620)}, lump) * (0.8 + 0.4 * n);
    }
    if (gMetal < 0.5) { gRough = 0.9; gSpec = 0.22; }
    // Little of the sky reaches down a crack: its faces darken fast with depth.
    if (what < 3.5) c *= mix(1.0, 0.18, smoothstep(0.5, 9.0, d));
    // What faces down is the broken underside of a block, in its own shadow but for the core's light.
    c *= mix(1.0, 0.4, smoothstep(-0.1, -0.6, dot(normalize(vObjN + vec3(0.0, 1e-5, 0.0)), radial)));
    gH = (wFbm(o * 0.22) - 0.5) * 2.2 * (1.0 - smoothstep(1.0, 3.0, px * 0.3));
    // The stream's light from below, on what faces into the deepest cracks: pale gold where it is strongest, falling
    // to flame and ember, and stronger toward the bottom. It lights the rock; nothing burns.
    float below = what > 1.5 && what < 2.5 ? 1.0 : smoothstep(5.0, 24.0, d);
    float vein = smoothstep(0.55, 0.85, wNoise(o * 0.16 + vec3(0.0, uT * 0.05, 0.0)));
    float k = glow * below * uCore;
    emi += gRamp(0.25 + 0.6 * k) * k * (what > 1.5 && what < 2.5 ? 0.35 + 0.9 * vein * k : 0.55) * 0.9;
    c *= 1.0 - 0.5 * glow * (1.0 - below);
    if (what > 2.5) emi = vec3(0.0);
  }
  gEmi = emi;
  diffuseColor.rgb = c;
}`,
    normal: 'normal = gBump(normal, gH, 0.0015);',
    rough: 'roughnessFactor = gRough;',
    metal: 'metalnessFactor = gMetal;',
    emissive: 'totalEmissiveRadiance = gEmi;',
  });
  specular(m);
  return m;
}
