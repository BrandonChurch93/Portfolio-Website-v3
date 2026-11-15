import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin, shade } from '../../../../world/surface';

// The ground's three materials: the rock, everything that is made (each thing says what it is made of in its cell
// attribute, so one program draws stone, steel, copper, glass, leaves and lights), and the city's floor. A shared
// clock uniform drives what breathes and blinks.

export interface GroundUniforms { uT: { value: number } }

const CELL_V = { vhead: 'attribute vec4 cell;\nvarying vec4 vCell;', vert: 'vCell = cell;' };

// The palette's lights as a ramp, ember to pale, in linear values.
const RAMP = `vec3 gRamp(float t){
  vec3 e = ${lin(hex('ember'))}, f = ${lin(hex('flame'))}, h = ${lin(hex('hot'))}, p = ${lin(hex('pale'))};
  return t < 0.333 ? mix(e, f, t * 3.0) : t < 0.667 ? mix(f, h, t * 3.0 - 1.0) : mix(h, p, t * 3.0 - 2.0);
}`;

// A bump worked out from a height in the fragment, in view space, as three's own bump map does it. The height is in
// units and the scale turns it into the view's metres.
const BUMP = `vec3 gBump(vec3 n, float h, float k){
  vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
  float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 g = sign(det) * (hx * r1 + hy * r2);
  vec3 m = abs(det) * n - g * k;
  return dot(m, m) > 1e-20 ? normalize(m) : n;
}`;

// The light the lift housings throw on the rock round them, from their places.
function podLights(pods: THREE.Vector3[]): string {
  return `const int G_PODS = ${pods.length};
vec3 gPods[${pods.length}] = vec3[](${pods.map((p) => `vec3(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`).join(', ')});`;
}

export function rockMaterial(u: GroundUniforms, pods: THREE.Vector3[], rimR: number): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0, side: THREE.DoubleSide });
  m.name = 'ground-rock';
  m.userData.uniforms = u;
  return shade(m, 'ground-rock', {
    ...CELL_V,
    head: `varying vec4 vCell; uniform float uT; float gPx; float gCut;
${RAMP}
${BUMP}
${podLights(pods)}
float gH(float i){ return fract(sin(i * 91.37 + 7.1) * 43758.5453); }`,
    color: `{
  gPx = length(fwidth(vObj));
  float k = floor(vCell.x), f = fract(vCell.x);
  float hk = gH(k), hb = vCell.y;
  // Each stratum its own stone: a few greys, some a little browner, some a little cooler, all near neutral.
  vec3 cool = ${lin(0x2e2d2c)}, warm = ${lin(0x332e2a)}, pale = ${lin(0x403d3a)}, deep = ${lin(0x1b1a19)};
  float pick = floor(hk * 4.0);
  vec3 c = pick < 0.5 ? deep : pick < 1.5 ? cool : pick < 2.5 ? warm : pale;
  c *= 0.8 + 0.4 * hb;
  // Each face is darker up under the lip of the stratum above it, and the rock darker the further down it hangs,
  // out of the light of the city.
  c *= mix(0.72, 1.0, smoothstep(0.0, 0.5, f)) * mix(1.0, 0.3, smoothstep(24.0, 150.0, -vObj.y));
  // Laminations inside a stratum, each a few units thick, leaned with the stratum, gone before they are finer than
  // a pixel.
  float lam = wNoise(vec3(vObj.x * 0.02, -vObj.y * 0.55 + wNoise(vObj * 0.03) * 2.0, vObj.z * 0.02));
  c *= 1.0 + (lam - 0.5) * 0.18 * (1.0 - smoothstep(0.6, 1.4, gPx * 0.55));
  // Grains and pits, and streaks run down the faces from the lips where the stone weeps.
  c *= 0.86 + 0.28 * mix(0.5, wFbm(vObj * 0.31), 1.0 - smoothstep(1.0, 3.0, gPx * 0.31));
  float streak = wNoise(vec3(atan(vObj.x, vObj.z) * 120.0, vObj.y * 0.04, 3.0));
  c *= 1.0 - 0.18 * smoothstep(0.6, 0.9, streak) * smoothstep(0.1, 0.8, f) * (1.0 - smoothstep(1.0, 3.0, gPx * 0.5));
  // The undersides of the ledges are darker, never washed: the dust and soot gather there.
  gCut = vCell.z;
  c *= mix(1.0, 0.85, gCut);
  // Where a channel was cut for a rib the stone is dressed: one even grey, a little paler, smooth.
  c = mix(c, ${lin(0x3a3835)} * (0.92 + 0.16 * hb) * mix(1.0, 0.3, smoothstep(24.0, 150.0, -vObj.y)), clamp(vCell.w, 0.0, 1.0));
  diffuseColor.rgb = c;
}`,
    normal: `{
  float px = gPx;
  // Broad chipped planes, and cracks as sharp grooves where a ridged noise is near its crest.
  float crack = pow(1.0 - abs(wNoise(vObj * 0.045 + 5.0) * 2.0 - 1.0), 8.0);
  float h = wFbm(vObj * 0.08) * 3.2 * (1.0 - smoothstep(0.8, 2.2, px * 0.15))
          - crack * 1.6 * (1.0 - smoothstep(0.6, 1.6, px * 0.2))
          + wNoise(vObj * 0.5) * 0.2 * (1.0 - smoothstep(0.6, 1.4, px * 0.5));
  normal = gBump(normal, h * (1.0 - 0.85 * clamp(vCell.w, 0.0, 1.0)) * mix(1.0, 0.3, smoothstep(0.2, 0.7, -normalize(vObjN + 1e-4).y)), ${(0.0015).toFixed(4)});
}`,
    rough: 'roughnessFactor = clamp(0.8 + 0.15 * wNoise(vObj * 0.2), 0.5, 1.0);',
    emissive: `{
  // Light the city throws over its edge onto the rock under the rim, and the glow of the lift housings.
  float depth = -vObj.y, outw = clamp(dot(normalize(vec3(vObj.x, 0.0, vObj.z) + 1e-4), normalize(vObjN + 1e-4)), 0.0, 1.0);
  float spill = exp(-(depth - 16.0) / 9.0) * smoothstep(${(rimR - 40).toFixed(1)}, ${(rimR - 6).toFixed(1)}, length(vObj.xz));
  vec3 e = gRamp(0.4) * spill * (0.25 + 0.75 * outw) * 0.06;
  for (int i = 0; i < G_PODS; i++) {
    vec3 d = vObj - gPods[i];
    float q = dot(d, d);
    float face = clamp(dot(normalize(vObjN + 1e-4), -normalize(d + 1e-4)) * 0.5 + 0.6, 0.0, 1.0);
    e += gRamp(0.22) * 0.22 * face * (1.0 / (1.0 + q / 160.0)) * smoothstep(1300.0, 100.0, q) * (0.88 + 0.12 * sin(uT * 0.9 + float(i) * 1.7));
  }
  totalEmissiveRadiance += e * diffuseColor.rgb * 9.0;
}`,
  });
}

// What a made thing is drawn as, by its cell attribute: x is the kind (KIND in ./shape.ts); for a light, y is where
// it is on the ramp from ember to pale, z how strong, and w how it moves (its whole part: 0 steady, 1 breathes,
// 2 a beacon's slow blink; its fraction a phase); for a leaf, y is how much light from the paths reaches it.
export function madeMaterial(u: GroundUniforms): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
  m.name = 'ground-made';
  m.userData.uniforms = u;
  shade(m, 'ground-made', {
    ...CELL_V,
    head: `varying vec4 vCell; uniform float uT; float gRough, gMetal, gLeafK; vec3 gEmi;
${RAMP}`,
    color: `{
  float kd = floor(vCell.x + 0.5);
  float px = length(fwidth(vObj));
  float n = wFbm(vObj * 0.25) * (1.0 - smoothstep(1.0, 3.0, px * 0.25));
  vec3 c = vec3(0.0); gRough = 0.6; gMetal = 0.0; gEmi = vec3(0.0); gLeafK = 0.0;
  if (kd < 0.5) { c = ${lin(0x4e4a46)} * (0.86 + 0.28 * n); gRough = 0.62 + 0.1 * n; }
  else if (kd < 1.5) { c = ${lin(0x6a6764)} * (0.9 + 0.2 * n); gRough = 0.28 + 0.1 * n; gMetal = 0.75; }
  else if (kd < 2.5) { c = ${lin(hex('copper'))} * (0.88 + 0.24 * n); gRough = 0.26 + 0.1 * n; gMetal = 1.0; }
  else if (kd < 3.5) { c = ${lin(0x141312)}; gRough = 0.85; }
  else if (kd < 4.5) {
    float w = vCell.w, mode = floor(w), ph = fract(w) * 6.2832;
    float k = vCell.z;
    if (mode > 0.5 && mode < 1.5) k *= 0.82 + 0.18 * sin(uT * 0.9 + ph);
    if (mode > 1.5) k *= 0.25 + 0.75 * smoothstep(0.55, 0.95, sin(uT * 0.55 + ph));
    c = ${lin(0x1a1714)}; gRough = 0.5; gEmi = gRamp(vCell.y) * k;
  }
  else if (kd < 5.5) { gLeafK = 1.0; c = ${lin(0x1d1b17)} * (0.8 + 0.4 * n); gRough = 0.95; gEmi = gRamp(0.3) * smoothstep(0.3, 1.0, vCell.y) * 0.05 * smoothstep(0.6, -0.6, vObjN.y); }
  else if (kd < 6.5) { c = ${lin(hex('bronze'))} * 0.55 * (0.85 + 0.3 * n); gRough = 0.42; gMetal = 1.0; }
  else if (kd < 7.5) { c = ${lin(0x0d0c0b)}; gRough = 0.08; gMetal = 0.0; gEmi = gRamp(0.3) * vCell.y; }
  else {
    // Slate in panels, each its own tone, the joints between them dark and fine.
    float along = atan(vObj.x, vObj.z) * length(vObj.xz);
    vec2 cellId = floor(vec2(along / 14.0, vObj.y / 5.2));
    float tone = fract(sin(dot(cellId, vec2(12.9898, 78.233))) * 43758.5453);
    vec2 q = abs(fract(vec2(along / 14.0, vObj.y / 5.2)) - 0.5) * vec2(14.0, 5.2);
    vec2 w = max(fwidth(vec2(along, vObj.y)), vec2(1e-3));
    float joint = max(smoothstep(6.85 - w.x, 6.85 + w.x, q.x), smoothstep(2.45 - w.y, 2.45 + w.y, q.y)) * min(1.0, 0.25 / max(w.x, w.y));
    c = ${lin(0x3b3936)} * (0.88 + 0.24 * tone) * (1.0 - 0.55 * joint) * (0.92 + 0.16 * n);
    gRough = 0.42 + 0.12 * tone;
  }
  diffuseColor.rgb = c;
}`,
    rough: 'roughnessFactor = gRough;',
    metal: 'metalnessFactor = gMetal;',
    emissive: 'totalEmissiveRadiance = gEmi;',
  });
  // A crown of leaves is a mass of small leaves, not one smooth skin: it has none of the sheen a smooth surface takes
  // at a glancing angle.
  const own = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    own.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'if (gLeafK > 0.5) outgoingLight = totalEmissiveRadiance + outgoingLight * 0.25;\n#include <opaque_fragment>');
  };
  return m;
}

// The city's floor: worked out per pixel from the plan (the plaza, the boulevards, the avenues, the parks, the
// promenade), with the glow round every tower's foot, the parks' paths and their pools from a map drawn once.
export function floorMaterial(u: GroundUniforms, map: THREE.Texture, plan: { plaza: number; rings: readonly number[]; road: number; avenues: readonly number[]; edge: number; r: number; parks: [number, number, number, number][] }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0 });
  m.name = 'ground-floor';
  m.userData.uniforms = { ...u, uMap: { value: map } };
  const rings = plan.rings.map((r) => r.toFixed(1)).join(', ');
  const aves = plan.avenues.map((a) => ((a * Math.PI) / 180).toFixed(5)).join(', ');
  return shade(m, 'ground-floor', {
    head: `uniform float uT; uniform sampler2D uMap; float gRough; vec3 gEmi;
${RAMP}
const float RINGS[${plan.rings.length}] = float[](${rings});
const float AVES[${plan.avenues.length}] = float[](${aves});
const vec4 PARKS[${plan.parks.length}] = vec4[](${plan.parks.map((q) => `vec4(${q.map((v) => v.toFixed(2)).join(', ')})`).join(', ')});
// A line of a width at a distance, its light kept as it is when it is finer than a pixel.
float gLine(float d, float w){ float a = max(fwidth(d), 1e-4); return (1.0 - smoothstep(w * 0.5 - a, w * 0.5 + a, abs(d))) * min(1.0, w / a); }
float gIn(float d, float w){ float a = max(fwidth(d), 1e-4); return 1.0 - smoothstep(w * 0.5 - a, w * 0.5 + a, abs(d)); }`,
    color: `{
  vec2 p = vObj.xz; float r = length(p);
  vec4 mp = texture2D(uMap, p / ${(2 * plan.r).toFixed(1)} + 0.5);
  float px = length(fwidth(vObj));
  float fine = 1.0 - smoothstep(0.5, 1.5, px * 0.4);
  vec3 pave = ${lin(0x3a3733)}, road = ${lin(0x1c1b1a)}, plaza = ${lin(0x56524c)}, lawn = ${lin(0x1b1a17)}, water = ${lin(0x0a0a09)}, prom = ${lin(0x4c4843)};
  // City blocks: paving in large slabs.
  vec3 c = pave * (0.9 + 0.2 * wNoise(vec3(floor(p * 0.12), 1.0)) * fine);
  float e = 0.0, lit = 0.0;
  // The roads, their curbs lit and lamps along them that leave pools of light on the walks.
  float onRoad = 0.0, curb = 0.0, pools = 0.0;
  for (int i = 0; i < ${plan.rings.length}; i++) {
    float d = r - RINGS[i];
    onRoad = max(onRoad, gIn(d, ${plan.road.toFixed(1)}));
    curb += gLine(abs(d) - ${(plan.road / 2 - 0.9).toFixed(2)}, 0.5);
    float along = atan(p.x, p.y) * RINGS[i];
    pools += gIn(abs(d) - ${(plan.road / 2 + 2.5).toFixed(2)}, 5.0) * (0.45 + 0.55 * mix(0.5, pow(0.5 + 0.5 * cos(along * 0.4488), 3.0), 1.0 - smoothstep(0.5, 1.0, fwidth(along) * 0.25)));
  }
  for (int i = 0; i < ${plan.avenues.length}; i++) {
    vec2 dir = vec2(sin(AVES[i]), cos(AVES[i]));
    float t = dot(p, dir), d = dir.x * p.y - dir.y * p.x;
    float span = step(${plan.plaza.toFixed(1)}, t) * step(t, ${plan.edge.toFixed(1)});
    onRoad = max(onRoad, gIn(d, ${plan.road.toFixed(1)}) * span);
    curb += gLine(abs(d) - ${(plan.road / 2 - 0.9).toFixed(2)}, 0.5) * span;
    pools += gIn(abs(d) - ${(plan.road / 2 + 2.5).toFixed(2)}, 5.0) * span * (0.45 + 0.55 * mix(0.5, pow(0.5 + 0.5 * cos(t * 0.4488), 3.0), 1.0 - smoothstep(0.5, 1.0, fwidth(t) * 0.25)));
  }
  c = mix(c, road * (0.92 + 0.16 * wNoise(vec3(p * 0.4, 2.0)) * fine), onRoad);
  // The parks: dark lawn, their paths lit, and their pools.
  float park = 0.0, deg = degrees(atan(p.x, p.y));
  for (int i = 0; i < ${plan.parks.length}; i++) {
    vec4 q = PARKS[i];
    float da = mod(deg - q.z + 720.0, 360.0), span = mod(q.w - q.z + 720.0, 360.0);
    float side = da <= span ? min(da, span - da) * r * 0.01745 : -1.0;
    float rad = min(r - q.x, q.y - r);
    float d = min(side, rad), a = max(fwidth(d), 1e-3);
    park = max(park, smoothstep(-a, a, d));
  }
  c = mix(c, lawn * (0.8 + 0.4 * wNoise(vec3(p * 0.3, 4.0)) * fine), park);
  c = mix(c, water, mp.b);
  // The plaza: pale stone in rings and rays round the spire, two rings of light let into it.
  float inPlaza = 1.0 - smoothstep(${(plan.plaza - 1).toFixed(1)}, ${(plan.plaza).toFixed(1)}, r);
  float joints = max(gLine(fract(r / 6.0 + 0.5) - 0.5, 0.06), gLine(fract(atan(p.x, p.y) * 7.639 + 0.5) - 0.5, 0.05) * step(30.0, r));
  c = mix(c, plaza * (1.0 - 0.35 * joints * fine), inPlaza);
  float plazaLight = (gLine(r - 46.0, 0.8) + gLine(r - ${(plan.plaza - 6).toFixed(1)}, 0.6)) * inPlaza;
  // The promenade round the rim: pale stone, lit along its foot by the parapet's lamps.
  float onProm = smoothstep(${(plan.edge - 1).toFixed(1)}, ${plan.edge.toFixed(1)}, r);
  c = mix(c, prom * (0.9 + 0.2 * wNoise(vec3(floor(vec2(r * 0.5, atan(p.x, p.y) * 200.0)), 3.0)) * fine), onProm);
  float wash = smoothstep(${(plan.r - 24).toFixed(1)}, ${(plan.r - 1).toFixed(1)}, r);
  gRough = mix(mix(0.82, 0.5, onRoad), 0.06, mp.b);
  gEmi = gRamp(0.45) * mp.r * 0.55 + gRamp(0.6) * mp.g * 0.9 + gRamp(0.5) * curb * 0.35 * (1.0 - park) + gRamp(0.38) * pools * 0.06
       + gRamp(0.62) * plazaLight * 0.7 + gRamp(0.5) * wash * wash * 0.12;
  diffuseColor.rgb = c;
}`,
    rough: 'roughnessFactor = gRough;',
    emissive: 'totalEmissiveRadiance = gEmi;',
  });
}
